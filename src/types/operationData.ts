// src/types/operationData.ts
// 运营数据模型(扁平结构)


interface UserRecentOperationData {
    date: string; // 日期,核心键值
    // 核心指标
    totalFans: string; // 总粉丝
    newFans: string; // 新增粉丝
    lostFans: string; // 流失粉丝
    netFansGrowth: string; // 净增粉丝
    homePageVisitors: string; // 首页访问量
    // 互动数据
    totalLikes: string; // 总点赞
    totalCollects: string; // 总收藏
    totalComments: string; // 总评论
    totalShares: string; // 总分享
    // 内容数据
    publishedNotes: string; 
    noteReads: string;
    noteReadRate: string;
    avgReadTime: string;
    // 流量数据
    trafficSources: Array<{
      name: string; // 来源名称
      percentage: string; // 百分比
    }>;
    // 粉丝兴趣
    fanInterests: string[]; // 粉丝兴趣
    // 趋势数据
    tendencies: Array<{
      metric: string; // 指标名称
      tendency: 'up' | 'down' | 'none';
      value: string; // 值
    }>;
  }
  

  // 序列化运营数据为文本格式
  function serializeOperationData(data: UserRecentOperationData): string {
    const lines: string[] = [];
    
    // 标题和日期
    lines.push(`📊 小红书运营数据报告`);
    lines.push(`📅 数据日期: ${data.date}`);
    lines.push('='.repeat(50));
    
    // 核心粉丝指标
    lines.push('\n👥 核心粉丝指标');
    lines.push(`   总粉丝数: ${data.totalFans.padStart(12)}`);
    lines.push(`   新增粉丝: ${data.newFans.padStart(12)}`);
    lines.push(`   流失粉丝: ${data.lostFans.padStart(12)}`);
    lines.push(`   净增粉丝: ${data.netFansGrowth.padStart(12)}`);
    lines.push(`   主页访客: ${data.homePageVisitors.padStart(12)}`); // 新增
    // 互动数据
    lines.push('\n💬 互动数据');
    lines.push(`   总点赞数: ${data.totalLikes.padStart(12)}`);
    lines.push(`   总收藏数: ${data.totalCollects.padStart(12)}`);
    lines.push(`   总评论数: ${data.totalComments.padStart(12)}`);
    lines.push(`   总分享数: ${data.totalShares.padStart(12)}`);
    
    // 内容数据
    lines.push('\n📝 内容数据');
    lines.push(`   发布笔记: ${data.publishedNotes.padStart(12)}`);
    lines.push(`   笔记阅读: ${data.noteReads.padStart(12)}`);
    lines.push(`   阅读率: ${data.noteReadRate.padStart(14)}`);
    lines.push(`   平均阅读时长: ${data.avgReadTime.padStart(8)}`);
    
    // 流量来源
    if (data.trafficSources.length > 0) {
      lines.push('\n🌐 流量来源分布');
      data.trafficSources.forEach(source => {
        lines.push(`   ${source.name.padEnd(10)}: ${source.percentage.padStart(8)}`);
      });
    }
    
    // 粉丝兴趣
    if (data.fanInterests.length > 0) {
      lines.push('\n🎯 粉丝兴趣标签');
      lines.push(`   粉丝兴趣标签为（按比例排序）：${data.fanInterests.join('、')}`);
    }
    
    // 趋势数据
    if (data.tendencies.length > 0) {
      lines.push('\n📈 数据趋势');
      data.tendencies.forEach(tendency => {
        const trendText = tendency.tendency === 'up' ? '上升' : 
                         tendency.tendency === 'down' ? '下降' : '持平';
        lines.push(`   ${tendency.metric.padEnd(15)} ${trendText.padEnd(4)} ${tendency.value.padStart(8)}`);
      });
    }
    
    lines.push('\n' + '='.repeat(50));
    return lines.join('\n');
  }
  


  // 导出类型和函数
  export { UserRecentOperationData, serializeOperationData };