Page({
  data: {
    updates: [
      {
        id: 1,
        status: 'bought',
        title: '购买成功',
        content: '您购买的“二手人体工学椅”已发货，请留意查收。',
        time: '昨天 14:30',
        image: '/assets/icons/furniture.png'
      },
      {
        id: 2,
        status: 'sold',
        title: '商品售出',
        content: '您发布的“闲置机械键盘”已被拍下，请尽快发货。',
        time: '前天 09:15',
        image: '/assets/icons/digital.png'
      }
    ]
  },
  onLoad(options) {

  }
})