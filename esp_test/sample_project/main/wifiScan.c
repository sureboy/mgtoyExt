#include "wifiScan.h" 
#include "esp_wifi.h"
//#include "esp_event.h"
#include "esp_log.h"
#include <string.h>
#include <stdio.h>
 
#define MAX_AP_NUM 20               // 最大跟踪的AP数量

#define RSSI_VARIANCE_THRESHOLD 5  // 方差阈值，需根据实际环境调试

 // 更新或添加AP到跟踪列表
static ap_history_t ap_list[MAX_AP_NUM];
static int ap_count = 0;
static const char *TAG = "RSSI_MOTION";
// 计算一组RSSI值的方差
/*
static uint32_t isqrt_u32(uint32_t n) {
    uint32_t root = 0;
    uint32_t bit = 1 << 30; // 从最高位开始试探（2^30）

    // 找到第一个不大于 n 的最高位
    while (bit > n) bit >>= 2;

    while (bit) {
        if (n >= root + bit) {
            n -= root + bit;
            root = (root >> 1) + bit;
        } else {
            root >>= 1;
        }
        bit >>= 2;
    }
    return root;
}*/
static float calculate_variance(int *data, int count) {
    if (count < 2) return 0;
    float sum = 0, mean = 0;
    for (int i = 0; i < count; i++) {
        sum += data[i];
    }
    mean = sum / count;
    float variance = 0;
    for (int i = 0; i < count; i++) {
        variance += (data[i] - mean) * (data[i] - mean);
    }
    return variance / count;
}
static void update_ap_history(wifi_ap_record_t *ap) {
    int idx = -1;
    // 查找是否已存在该AP（通过BSSID匹配）
    for (int i = 0; i < ap_count; i++) {
        if (memcmp(ap_list[i].bssid, ap->bssid, 6) == 0) {
            idx = i;
            break;
        }
    }
    
    // 如果是新AP且列表未满，则添加
    if (idx == -1 && ap_count < MAX_AP_NUM) {
        idx = ap_count;
        memcpy(ap_list[idx].bssid, ap->bssid, 6);
        strcpy(ap_list[idx].ssid, (char*)ap->ssid);
        ap_list[idx].history_count = 0;
        ap_list[idx].history_index = 0;
        ap_list[idx].active = true;
        ap_count++;
    }
    
    if (idx != -1) {
        // 将新的RSSI值写入环形缓冲区
        ap_list[idx].rssi_history[ap_list[idx].history_index] = ap->rssi;
        ap_list[idx].history_index = (ap_list[idx].history_index + 1) % WINDOW_SIZE;
        if (ap_list[idx].history_count < WINDOW_SIZE) {
            ap_list[idx].history_count++;
        }
        ap_list[idx].active = true;
        // 计算该AP的方差
        ap_list[idx].variance = calculate_variance(ap_list[idx].rssi_history,
                                                    ap_list[idx].history_count);
    }
}
static uint8_t detect_motion(void) {
    int active_ap_count = 0;
    float total_variance = 0;
    
    // 统计所有活跃AP的方差
    for (int i = 0; i < ap_count; i++) {
        if (ap_list[i].active && ap_list[i].history_count >= WINDOW_SIZE / 2) {
            total_variance += ap_list[i].variance;
            active_ap_count++;
        }
    }
    
    if (active_ap_count == 0) {
        ESP_LOGI(TAG, "No active AP, status unknown");
        return 0;
    }
    
    float avg_variance = total_variance / active_ap_count;
    //uint8_t std_int = (uint8_t)isqrt_u32((uint32_t)avg_variance); 
    
    //return std_int;
    bool is_moving = (avg_variance > RSSI_VARIANCE_THRESHOLD);
    
    // 打印调试信息
    ESP_LOGI(TAG, "Active APs: %d, Avg Variance: %.2f, Status: %s",
             active_ap_count, avg_variance, is_moving ? "MOVING" : "STATIONARY");

    return 0;
}

// 处理扫描结果
static void process_scan_results(wifi_ap_record_t *ap_info, uint16_t ap_num) {
    // 先将所有AP标记为非活跃
    for (int i = 0; i < ap_count; i++) {
        ap_list[i].active = false;
    }
    
    // 更新每个扫描到的AP
    for (int i = 0; i < ap_num && i < 64; i++) {
        update_ap_history(&ap_info[i]);
    }
    
    // 判断移动状态
    //detect_motion();
}

uint8_t handleWifiScanEvent(){
    uint16_t ap_num;
    esp_wifi_scan_get_ap_num(&ap_num);
    //ESP_LOGI(TAG, "ap_num %d",ap_num);
    if (ap_num > 0) {
        wifi_ap_record_t *ap_info = malloc(ap_num * sizeof(wifi_ap_record_t));
        esp_wifi_scan_get_ap_records(&ap_num, ap_info);
        process_scan_results(ap_info, ap_num);
        free(ap_info);
        return detect_motion();
    }
    return 0;
}
void scan_task(void *pvParameters) {
 
    while (1) {
        // 启动扫描
        esp_wifi_scan_start(NULL, true);  // false = 非阻塞
        // 等待扫描完成（事件驱动，或简单延时）
        vTaskDelay(pdMS_TO_TICKS(1000));   // 扫描间隔1秒
    }
}