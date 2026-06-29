#include "InitializeParameters.h"
#include "cJSON.h"
#include "esp_wifi.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "nvs.h"
#define BUF_SIZE 2048


void update_WIFISet(cJSON *root){

    cJSON *ssid_item = cJSON_GetObjectItem(root, "ssid");
    cJSON *password_item = cJSON_GetObjectItem(root, "password"); 
    if (
        !cJSON_IsString(ssid_item) &&
        !cJSON_IsString(password_item)  ){
        return;
    }
    wifi_config_t wifi_config;
    ESP_ERROR_CHECK(esp_wifi_get_config(WIFI_IF_STA, &wifi_config));
    int isWiFiSet = 0;
    if ((ssid_item->valuestring != NULL)) {
        isWiFiSet++;
        //printf("Wi-Fi名称: %s\n", ssid_item->valuestring);
        strlcpy((char *)wifi_config.sta.ssid, 
            ssid_item->valuestring, 
            sizeof(wifi_config.sta.ssid)); 
        wifi_config.sta.ssid[sizeof(wifi_config.sta.ssid) - 1] = '\0';
    } 
    if ((password_item->valuestring != NULL)) {
        //printf("Wi-Fi密码: %s\n", password_item->valuestring);
        isWiFiSet++;
        strlcpy((char *)wifi_config.sta.password, 
            password_item->valuestring, 
            sizeof(wifi_config.sta.password)); 
        wifi_config.sta.password[sizeof(wifi_config.sta.password) - 1] = '\0';
    }
    if (isWiFiSet>0){ 
        esp_wifi_stop();
        ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
        esp_wifi_start();
    }
}
void update_UDPServer(cJSON *root){
    cJSON *udp_data = cJSON_GetObjectItem(root, NVS_KEY);
    if ( !cJSON_IsString(udp_data) ){
        return;
    }  
    if ( udp_data->valuestring != NULL ) {
        ESP_ERROR_CHECK(
            write_nvs_str(
                NVS_NAMESPACE, NVS_KEY,udp_data->valuestring
            )
        );
    }
    
}
bool parse_serial_config(const char *json_string) {
    // 1. 解析JSON字符串，返回根节点指针
    cJSON *root = cJSON_Parse(json_string);
    if (root == NULL) {
        const char *error_ptr = cJSON_GetErrorPtr();
        if (error_ptr != NULL) {
            printf("JSON解析错误,位置: %s\n", error_ptr);
        }
        return false;
    }
    update_WIFISet(root);
    update_UDPServer(root);
    cJSON_Delete(root);
    return true;
}
void task_InitializeParameters(void *pvParameters) {
    char input_buf[BUF_SIZE];
    while (1) { 
        memset(input_buf, 0, BUF_SIZE);
        if (fgets(input_buf, BUF_SIZE, stdin) != NULL) {
            //input_buf[strcspn(input_buf, "\n")] = 0; 
            printf("你输入了: %s\n", input_buf);
            if (parse_serial_config(input_buf)) {
                break;
            }            
        }
        vTaskDelay(pdMS_TO_TICKS(100));
    }
    vTaskDelete(NULL);
}