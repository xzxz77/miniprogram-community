// pages/profile/subpages/my-posts/index.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    postList: [],
    isLoading: true
  },

  onLoad() {
    this.fetchMyPosts();
  },

  async fetchMyPosts() {
    this.setData({ isLoading: true });
    
    let openid = app.globalData.openid;
    if (!openid) {
       // Try to get from storage or wait
       // For now, let's assume if not in globalData, we might need to call login again or just fail
       // But usually app.js runs first.
       try {
         const { result } = await wx.cloud.callFunction({ name: 'login' });
         openid = result.openid;
         app.globalData.openid = openid;
       } catch (e) {
         console.error(e);
         wx.showToast({ title: '登录失败', icon: 'none' });
         this.setData({ isLoading: false });
         return;
       }
    }

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_posts',
        data: { userId: openid }
      });

      if (result.success) {
        this.setData({
          postList: result.data,
          isLoading: false
        });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
        this.setData({ isLoading: false });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '网络异常', icon: 'none' });
      this.setData({ isLoading: false });
    }
  },

  onPostTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post-detail/index?id=${id}`
    });
  },

  previewImage(e) {
    const urls = e.currentTarget.dataset.urls;
    const current = e.currentTarget.dataset.current;
    wx.previewImage({
      current,
      urls
    });
  },

  onDeleteTap(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;

    wx.showModal({
      title: '提示',
      content: '确定要删除这条动态吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          try {
            // Use database remove directly
            await db.collection('posts').doc(id).remove();

            wx.hideLoading();
            wx.showToast({ title: '删除成功' });
            
            // Remove from list
            const newList = this.data.postList;
            newList.splice(index, 1);
            this.setData({ postList: newList });

          } catch (err) {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});