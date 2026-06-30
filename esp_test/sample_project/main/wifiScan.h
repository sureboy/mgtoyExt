#ifndef WIFISCAN_H
#define WIFISCAN_H
#include <stdlib.h>

//#include "freertos/FreeRTOS.h"
//#include "freertos/task.h"
//#include "freertos/event_groups.h"
//#include "esp_system.h"
//#include "esp_wifi.h"
//#include "esp_event.h"
//#include "esp_log.h"
//#include "nvs_flash.h"
//#include "esp_mac.h"

#define WINDOW_SIZE 3              // 滑动窗口大小（采样次数）

// 用于存储一个AP的扫描历史
typedef struct {
    uint8_t bssid[6];               // AP的MAC地址
    char ssid[32];                  // AP名称（可选）
    int rssi_history[WINDOW_SIZE];  // 历史RSSI值环形缓冲区
    int history_count;              // 当前已存的历史数量
    int history_index;              // 下一个要写入的位置
    float variance;                 // 当前计算的方差
    bool active;                    // 该AP是否在最新扫描中出现
} ap_history_t;



void scan_task(void *pvParameters) ;
uint8_t handleWifiScanEvent();
#endif