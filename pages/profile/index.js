// pages/profile/index.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    statusBarHeight: 20, // Default fallback
    userInfo: {
      nickName: '点击登录/注册',
      avatarUrl: '', // Default placeholder or empty
      bio: '点击设置个性签名',
      days: 1,
      verified: false
    },
    stats: {
      collection: 12,
      follow: 5,
      fans: 108,
      selling: 32
    },
    showEditModal: false,
    tempUserInfo: {}
  },

  onLoad: function () {
    // Get system info for custom nav bar
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight
    });

    this.loadUserProfile();
  },

  loadUserProfile() {
    wx.showLoading({ title: '加载中' });
    db.collection('users').get().then(res => {
      wx.hideLoading();
      if (res.data.length > 0) {
        const user = res.data[0];
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...user,
            bio: user.bio || '点击设置个性签名' 
          }
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('Failed to load user profile', err);
    });
  },

  onEditProfile() {
    this.setData({
      showEditModal: true,
      tempUserInfo: { 
        ...this.data.userInfo, 
        bio: this.data.userInfo.bio === '点击设置个性签名' ? '' : this.data.userInfo.bio 
      }
    });
  },

  closeEditModal() {
    this.setData({
      showEditModal: false
    });
  },

  noop() {}, // Prevent event bubbling

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
        console.error(err);
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
    wx.showLoading({ title: '保存中' });

    const userData = {
      nickName: tempUserInfo.nickName,
      avatarUrl: tempUserInfo.avatarUrl,
      bio: tempUserInfo.bio,
    };

    // Check if user exists
    db.collection('users').get().then(res => {
      if (res.data.length > 0) {
        // Update
        const id = res.data[0]._id;
        db.collection('users').doc(id).update({
          data: userData
        }).then(() => {
          this.finishSave(userData);
        });
      } else {
        // Create
        db.collection('users').add({
          data: {
            ...userData,
            days: 1,
            verified: false,
            createTime: db.serverDate()
          }
        }).then(() => {
          this.finishSave(userData);
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  finishSave(userData) {
    wx.hideLoading();
    wx.showToast({ title: '保存成功' });
    this.setData({
      showEditModal: false,
      userInfo: {
        ...this.data.userInfo,
        ...userData,
        bio: userData.bio || '点击设置个性签名'
      }
    });
  }
})
