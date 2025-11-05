// src/types/userProfile.ts

// 用户资料接口
export interface UserProfile {
    accountName: string;
    followingCount: string;
    fansCount: string;
    likesAndCollects: string;
    xhsAccountId: string;
    description: string;
    accountStatus: string; // 从图片alt属性获取
  }