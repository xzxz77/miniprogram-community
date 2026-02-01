// pages/profile/subpages/follow-list/index.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    type: 'follow', // follow or fans
    userList: [],
    isLoading: true
  },

  onLoad: function (options) {
    if (options.type) {
      this.setData({ type: options.type });
      wx.setNavigationBarTitle({
        title: options.type === 'fans' ? '我的粉丝' : '我的关注'
      });
    }
    this.loadData();
  },

  async toggleFollow(e) {
    const { id, index } = e.currentTarget.dataset;
    const user = this.data.userList[index];
    const action = user.followed ? 'unfollow' : 'follow';

    // Optimistic update
    const key = `userList[${index}].followed`;
    this.setData({
      [key]: !user.followed
    });

    try {
      if (action === 'unfollow') {
        // Remove from follows collection
        await db.collection('follows').where({
          _openid: app.globalData.openid,
          followedId: id
        }).remove();
      } else {
        // Add to follows collection
        await db.collection('follows').add({
          data: {
            followedId: id,
            createTime: db.serverDate()
          }
        });
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      this.setData({
        [key]: user.followed
      });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async loadData() {
    this.setData({ isLoading: true });
    
    // Ensure openid
    if (!app.globalData.openid) {
       try {
         const { result } = await wx.cloud.callFunction({ name: 'login' });
         app.globalData.openid = result.openid;
       } catch(e) { return; }
    }

    try {
      let followRecords = [];
      
      if (this.data.type === 'follow') {
        // 我关注的人: _openid = 我
        const res = await db.collection('follows').where({
          _openid: app.globalData.openid
        }).orderBy('createTime', 'desc').get();
        followRecords = res.data;
      } else {
        // 关注我的人: followedId = 我
        const res = await db.collection('follows').where({
          followedId: app.globalData.openid
        }).orderBy('createTime', 'desc').get();
        followRecords = res.data;
      }

      if (followRecords.length === 0) {
        this.setData({ userList: [], isLoading: false });
        return;
      }

      // 获取目标用户 ID 列表
      const targetIds = followRecords.map(item => 
        this.data.type === 'follow' ? item.followedId : item._openid
      );

      // 批量获取用户信息
      const userListPromises = targetIds.map(async (uid) => {
        try {
          const uRes = await wx.cloud.callFunction({
            name: 'get_user_info',
            data: { openid: uid }
          });
          if (uRes.result.success) {
            return {
              id: uid,
              ...uRes.result.data,
              // followed will be set later
            };
          }
        } catch (e) {
          console.error('Fetch user info error:', e);
        }
        return null;
      });

      const userResults = await Promise.all(userListPromises);
      let userList = userResults.filter(item => item !== null);
      
      // Determine 'followed' status
      if (this.data.type === 'follow') {
          // In "My Follows" list, naturally I follow them all
          userList = userList.map(u => ({ ...u, followed: true }));
      } else {
          // In "My Fans" list, check which ones I follow back
          const fanIds = userList.map(u => u.id);
          if (fanIds.length > 0) {
            const _ = db.command;
            // Check if I follow these fans
            const myFollowsRes = await db.collection('follows').where({
              _openid: app.globalData.openid,
              followedId: _.in(fanIds)
            }).get();
            
            const myFollowedIds = new Set(myFollowsRes.data.map(item => item.followedId));
            userList = userList.map(u => ({
              ...u,
              followed: myFollowedIds.has(u.id)
            }));
          } else {
             userList = userList.map(u => ({ ...u, followed: false }));
          }
      }

      this.setData({ userList, isLoading: false });

    } catch (err) {
      console.error(err);
      this.setData({ isLoading: false });
    }
  },

  onUserTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/user-home/index?id=${id}`
    });
  }
})
