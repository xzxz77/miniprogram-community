// pages/publish/index.js
Page({
  data: {
    images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80'],
    title: '',
    description: '',
    price: 1800,
    location: '幸福花园小区',
    category: '数码产品',
    deliveryMethod: '自提/邮寄',
    agreed: true
  },

  onLoad(options) {

  },

  onCancel() {
    wx.navigateBack()
  },

  onPublish() {
    wx.showToast({
      title: '发布成功',
      icon: 'success'
    })
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 9 - this.data.images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          images: [...this.data.images, ...tempFiles]
        })
      }
    })
  },

  onRemoveImage(e) {
    // In a real app, you'd pass index via data-index
    // For now, just a stub or remove the mock image
    const index = e.currentTarget.dataset.index;
    const newImages = [...this.data.images];
    // logic to remove
    // this.setData({ images: newImages })
    wx.showToast({
      title: '删除图片',
      icon: 'none'
    })
  }
})
