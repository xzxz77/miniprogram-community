// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-5gkt6aas74a87c0a', // 您的环境 ID
        traceUser: true,
      })
    }
    
    // 尝试静默登录
    this.checkUserLogin();
  },

  async checkUserLogin() {
    try {
      // 1. 调用云函数获取 OpenID
      const { result } = await wx.cloud.callFunction({ name: 'login' });
      const openid = result.openid;
      
      this.globalData.openid = openid;

      // 2. 查询数据库是否存在该用户
      const db = wx.cloud.database();
      const res = await db.collection('users').where({ _openid: openid }).get();

      if (res.data.length > 0) {
        // 已注册：更新全局数据
        this.globalData.userInfo = res.data[0];
        this.globalData.isLogged = true;
      } else {
        // 未注册
        this.globalData.userInfo = null;
        this.globalData.isLogged = false;
      }
      
      // 如果有回调等待，执行回调
      if (this.userLoginReadyCallback) {
        this.userLoginReadyCallback(this.globalData.userInfo);
      }

    } catch (err) {
      console.error('登录检查失败', err);
      // 即使失败，也要尝试触发回调以免页面死等
      if (this.userLoginReadyCallback) {
        this.userLoginReadyCallback(null);
      }
    }
  },

  // 提供全局注册方法
  async registerUser(userData) {
    const db = wx.cloud.database();
    try {
      // 默认基础信息
      const newUser = {
        ...userData, // 包含 nickName, avatarUrl 等
        credit: '信用极好',
        verified: false,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        bio: '这个人很懒，什么都没写'
      };

      const res = await db.collection('users').add({
        data: newUser
      });

      // 更新全局状态
      this.globalData.userInfo = { ...newUser, _id: res._id, _openid: this.globalData.openid };
      this.globalData.isLogged = true;
      return true;

    } catch (err) {
      console.error('注册失败', err);
      return false;
    }
  },

  globalData: {
    userInfo: null,
    openid: null,
    isLogged: false
  }
})
