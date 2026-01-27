// pages/profile/subpages/follow-list/index.js
Page({
  data: {
    type: 'follow', // follow or fans
    userList: [
      {
        id: 1,
        name: '花店老板娘',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&h=100',
        location: '2栋',
        credit: '信用极好',
        followed: true
      },
      {
        id: 2,
        name: '装修老王',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100',
        location: '5栋',
        credit: '信用良好',
        followed: true
      }
    ]
  },

  onLoad: function (options) {
    if (options.type) {
      this.setData({ type: options.type });
      wx.setNavigationBarTitle({
        title: options.type === 'fans' ? '我的粉丝' : '我的关注'
      });
    }
  },

  toggleFollow(e) {
    const id = e.currentTarget.dataset.id;
    const list = this.data.userList.map(item => {
      if (item.id === id) {
        item.followed = !item.followed;
      }
      return item;
    });
    this.setData({ userList: list });
  }
})
