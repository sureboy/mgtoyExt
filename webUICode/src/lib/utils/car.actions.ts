// src/lib/constants/car.actions.ts
// 9个动作：0=停止，1-8=动作
export const CAR_ACTIONS = {
  STOP: 0b0000,        // 0000 - 停止
  FORWARD: 0b0001,     // 0001 - 前进
  BACKWARD: 0b0010,    // 0010 - 后退
  LEFT_TURN: 0b0011,   // 0011 - 左转
  RIGHT_TURN: 0b0100,  // 0100 - 右转
  LEFT_PIVOT: 0b0101,  // 0101 - 原地左转
  RIGHT_PIVOT: 0b0110, // 0110 - 原地右转
  LEFT_ARC: 0b0111,    // 0111 - 左弧线前进
  RIGHT_ARC: 0b1000,   // 1000 - 右弧线前进
} as const;

// 动作名称和描述
export const ACTION_DETAILS: Record<number, { name: string; description: string; }> = {
  [CAR_ACTIONS.STOP]: { 
    name: '停止', 
    description: '两个电机停止' 
  },
  [CAR_ACTIONS.FORWARD]: { 
    name: '前进', 
    description: '两个电机全速前进' 
  },
  [CAR_ACTIONS.BACKWARD]: { 
    name: '后退', 
    description: '两个电机全速后退' 
  },
  [CAR_ACTIONS.LEFT_TURN]: { 
    name: '左转', 
    description: '右电机前进，左电机停止' 
  },
  [CAR_ACTIONS.RIGHT_TURN]: { 
    name: '右转', 
    description: '左电机前进，右电机停止' 
  },
  [CAR_ACTIONS.LEFT_PIVOT]: { 
    name: '原地左转', 
    description: '左电机后退，右电机前进（原地旋转）' 
  },
  [CAR_ACTIONS.RIGHT_PIVOT]: { 
    name: '原地右转', 
    description: '左电机前进，右电机后退（原地旋转）' 
  },
  [CAR_ACTIONS.LEFT_ARC]: { 
    name: '左弧线前进', 
    description: '右电机全速，左电机半速' 
  },
  [CAR_ACTIONS.RIGHT_ARC]: { 
    name: '右弧线前进', 
    description: '左电机全速，右电机半速' 
  },
};