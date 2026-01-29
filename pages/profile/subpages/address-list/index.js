// pages/profile/subpages/address-list/index.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    addressList: [],
    showModal: false,
    isEdit: false,
    editIndex: -1,
    tempAddress: {
      name: '',
      phone: '',
      address: '',
      isDefault: false
    }
  },

  onLoad: function () {
    this.loadAddressList();
  },

  loadAddressList() {
    wx.showLoading({ title: '加载中' });
    // 从云数据库 'users' 集合中获取当前用户的地址列表
    // 假设地址列表存储在 user 记录的 addressList 字段中
    db.collection('users').get().then(res => {
      wx.hideLoading();
      if (res.data.length > 0) {
        const user = res.data[0];
        this.setData({
          addressList: user.addressList || []
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('加载地址失败', err);
    });
  },

  onAddAddress() {
    this.setData({
      showModal: true,
      isEdit: false,
      tempAddress: { name: '', phone: '', address: '', isDefault: false }
    });
  },

  onEditAddress(e) {
    const index = e.currentTarget.dataset.index;
    const address = this.data.addressList[index];
    this.setData({
      showModal: true,
      isEdit: true,
      editIndex: index,
      tempAddress: { ...address }
    });
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  noop() {},

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`tempAddress.${field}`]: e.detail.value
    });
  },

  onSwitchChange(e) {
    this.setData({
      'tempAddress.isDefault': e.detail.value
    });
  },

  saveAddress() {
    const { tempAddress, addressList, isEdit, editIndex } = this.data;
    
    if (!tempAddress.name || !tempAddress.phone || !tempAddress.address) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(tempAddress.phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中' });

    let newList = [...addressList];

    // 如果设为默认，先取消其他默认
    if (tempAddress.isDefault) {
      newList = newList.map(item => ({ ...item, isDefault: false }));
    }

    if (isEdit) {
      newList[editIndex] = tempAddress;
    } else {
      // 新增地址分配一个临时ID，实际场景可能不需要，或者由后端生成
      tempAddress.id = Date.now(); 
      newList.push(tempAddress);
    }

    // 调用云函数更新
    this.updateCloudAddressList(newList);
  },

  deleteAddress() {
    const { addressList, editIndex } = this.data;
    wx.showModal({
      title: '提示',
      content: '确定要删除该地址吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          const newList = [...addressList];
          newList.splice(editIndex, 1);
          this.updateCloudAddressList(newList);
        }
      }
    });
  },

  updateCloudAddressList(newList) {
    // 复用 Address_updata 云函数 (实际上是通用的 user_updata 逻辑，或者专门的 Address_updata)
    // 这里我们假设 Address_updata 逻辑与 user_updata 类似，都是接收 data 并更新到 users 集合
    wx.cloud.callFunction({
      name: 'Address_updata',
      data: {
        data: {
          addressList: newList
        }
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        this.setData({
          addressList: newList,
          showModal: false
        });
        wx.showToast({ title: '操作成功' });
      } else {
        wx.showToast({ title: '操作失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  }
})
