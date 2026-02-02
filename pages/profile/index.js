// pages/profile/index.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    statusBarHeight: 20, 
    userInfo: {
      nickName: '点击登录/注册',
      avatarUrl: '', 
      bio: '点击设置个性签名',
      days: 1,
      verified: false
    },
    isLogged: false, 
    stats: {
      collection: 0,
      follow: 0,
      fans: 0,
      selling: 0 // Will be updated
    },
    showEditModal: false,
    tempUserInfo: {}
  },

  onLoad: function () {
    const sysInfo = wx.getWindowInfo();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });

    // Check global login status
    if (app.globalData.isLogged && app.globalData.userInfo) {
      this.setUserInfo(app.globalData.userInfo);
    } else {
      app.userLoginReadyCallback = (userInfo) => {
        if (userInfo) {
          this.setUserInfo(userInfo);
        }
      };
    }
  },

  onShow() {
    // Refresh stats when showing page
    if (app.globalData.isLogged) {
      this.loadStats();
    }
  },

  setUserInfo(user) {
    let days = 1;
    if (user.createTime) {
        const now = new Date();
        const createTime = new Date(user.createTime);
        const diffTime = now - createTime;
        days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    this.setData({
      isLogged: true,
      userInfo: {
        ...this.data.userInfo,
        ...user,
        bio: user.bio || '点击设置个性签名',
        days: days
      }
    });
    this.loadStats();
  },

  loadStats() {
    if (!app.globalData.openid) return;

    wx.cloud.callFunction({
      name: 'get_user_stats'
    }).then(res => {
      console.log('Stats res:', res);
      if (res.result && res.result.success) {
        this.setData({
          stats: res.result.data
        });
      } else {
        console.warn('获取统计失败', res);
      }
    }).catch(err => {
      console.error('云函数调用异常', err);
    });
  },

  onEditProfile() {
    if (!this.data.isLogged) {
      this.handleLogin();
      return;
    }

    this.setData({
      showEditModal: true,
      tempUserInfo: { 
        ...this.data.userInfo, 
        bio: this.data.userInfo.bio === '点击设置个性签名' ? '' : this.data.userInfo.bio 
      }
    });
  },

  handleLogin() {
    wx.showLoading({ title: '登录中' });
    app.checkUserLogin().then(() => {
        wx.hideLoading();
        if (app.globalData.isLogged) {
            this.setUserInfo(app.globalData.userInfo);
        } else {
            this.setData({
                showEditModal: true,
                tempUserInfo: {
                    nickName: '微信用户',
                    avatarUrl: '',
                    bio: ''
                }
            });
        }
    });
  },

  closeEditModal() {
    this.setData({
      showEditModal: false
    });
  },

  noop() {}, 

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    
    wx.showLoading({ title: '上传中' });
    const cloudPath = 'avatars/' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '.jpg';
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: avatarUrl,
      success: res => {
        this.setData({
          'tempUserInfo.avatarUrl': res.fileID
        });
        wx.hideLoading();
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  onNicknameChange(e) {
    this.setData({
      'tempUserInfo.nickName': e.detail.value
    });
  },

  onNicknameInput(e) {
    this.setData({
      'tempUserInfo.nickName': e.detail.value
    });
  },

  onBioChange(e) {
    this.setData({
      'tempUserInfo.bio': e.detail.value
    });
  },

  saveProfile() {
    const { tempUserInfo } = this.data;
    if (!tempUserInfo.nickName || !tempUserInfo.avatarUrl) {
        wx.showToast({ title: '请补全头像和昵称', icon: 'none' });
        return;
    }

    wx.showLoading({ title: '保存中' });

    const userData = {
      nickName: tempUserInfo.nickName,
      avatarUrl: tempUserInfo.avatarUrl,
      bio: tempUserInfo.bio,
    };

    if (!this.data.isLogged) {
        app.registerUser(userData).then(success => {
            wx.hideLoading();
            if (success) {
                this.finishSave(userData);
            } else {
                wx.showToast({ title: '注册失败', icon: 'none' });
            }
        });
    } else {
        wx.cloud.callFunction({
          name: 'user_updata',
          data: {
            data: userData
          }
        }).then(res => {
          if (res.result.success) {
            this.finishSave(userData);
          } else {
            wx.hideLoading();
            wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
          }
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: '网络异常', icon: 'none' });
        });
    }
  },

  finishSave(userData) {
    wx.hideLoading();
    wx.showToast({ title: '保存成功' });
    this.setData({
      showEditModal: false,
      isLogged: true,
      userInfo: {
        ...this.data.userInfo,
        ...userData,
        bio: userData.bio || '点击设置个性签名'
      }
    });
    app.globalData.userInfo = this.data.userInfo;
    app.globalData.isLogged = true;
  }
})
