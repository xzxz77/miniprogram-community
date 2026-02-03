Page({
  data: {
    interactions: [
      {
        id: 1,
        type: 'like',
        user: {
          nickName: '张三',
          avatarUrl: '/assets/icons/profile.png'
        },
        content: '赞了你的商品',
        targetImage: '/assets/icons/furniture.png',
        time: '10分钟前'
      },
      {
        id: 2,
        type: 'comment',
        user: {
          nickName: '李四',
          avatarUrl: '/assets/icons/profile.png'
        },
        content: '评论了：这个还能便宜吗？',
        targetImage: '/assets/icons/digital.png',
        time: '1小时前'
      }
    ]
  },
  onLoad(options) {

  }
})