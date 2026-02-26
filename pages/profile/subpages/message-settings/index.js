// pages/profile/subpages/message-settings/index.js
Page({
  data: {
    settings: {
      chat: true,
      transaction: true,
      interaction: true,
      system: true
    }
  },

  onLoad() {
    const stored = wx.getStorageSync('messageSettings');
    if (stored) {
      this.setData({ settings: stored });
    }
  },

  onSwitchChange(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    
    const newSettings = {
      ...this.data.settings,
      [key]: value
    };

    this.setData({ settings: newSettings });
    wx.setStorageSync('messageSettings', newSettings);
  }
})