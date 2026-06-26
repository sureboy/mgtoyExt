#include "freertos/FreeRTOS.h"
#include "sdkconfig.h"
//#include "driver/gpio.h"
#include "nvs_flash.h"

#include "esp_log.h"
#include "esp_wifi.h"

#include "wrapper.h" 
#include "wifiScan.h"  
#include "wifi.h"
#include "led.h"
#include "pwm.h"
static EventGroupHandle_t s_wifi_event_group;

#define EXAMPLE_ESP_MAXIMUM_RETRY  CONFIG_ESP_MAXIMUM_RETRY

#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT      BIT1
#define BLINK_GPIO CONFIG_BLINK_GPIO
static const char *TAG = "mgtoy";
//static cJSON *root;

static int s_retry_num = 0; 
//static TaskHandle_t led_task_handle = NULL;
static TaskHandle_t udp_task_handle = NULL;
static gpio_num_t PWMS[] = {GPIO_NUM_0, GPIO_NUM_1, GPIO_NUM_3, GPIO_NUM_10};

void my_udp_callback(char data) {
    led_blink();
    ESP_LOGI(TAG, "UDP callback: 0x%02X", (unsigned char)data);
    pwm_worker(data);
}
 
void task_udp(void *pvParameters){
    ESP_LOGI(TAG, "UDP loop");
    while (1) {
        udp_server_loop();
        vTaskDelay(pdMS_TO_TICKS(10));   // 10ms 轮询
    }
    vTaskDelete(NULL);
} 
static void event_handler(void* arg, esp_event_base_t event_base,
                                int32_t event_id, void* event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        ESP_LOGI(TAG, "got ip:" IPSTR, IP2STR(&event->ip_info.ip));
        s_retry_num = 0;
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
         
        udp_server_init();

        // 4. 设置服务器地址（例如 192.168.1.8:9002）和控制字节
        udp_server_set_addr(192, 168, 1, 8, 9002, 0x55);

        // 5. 初始化发送报文（序列号 0，无名称和本地 IP）
        //IP2STR(&event->ip_info.ip);
        //uint16_t ip1,uint16_t ip2, uint16_t ip3, uint16_t ip4 = IP2STR(&event->ip_info.ip)
        char ip[] = { IP2STR(&event->ip_info.ip)};
        for (int i = 0;i<strlen(ip);i++){
            ip[i]^=255;
        } 
        ESP_LOGI(TAG,"localip:%d %d %d %d",ip[0],ip[1],ip[2],ip[3]);
        udp_server_init_msg(1, "testmg",ip );

        // 6. 注册回调（可选）
        pwm_group_init(PWMS);
        udp_server_set_callback(my_udp_callback);
        if (udp_task_handle==NULL){
            xTaskCreatePinnedToCore(
            task_udp, "udp_task", 2048*2, 
            NULL, 1,&udp_task_handle, tskNO_AFFINITY);
        } 
        xTaskCreate(scan_task, "scan_task", 4096, NULL, 5, NULL);
    }else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_SCAN_DONE){
        udp_server_send(handleWifiScanEvent());
    } else {
        if (udp_task_handle!=NULL 
            && (event_base == WIFI_EVENT 
                && (event_id == WIFI_EVENT_STA_DISCONNECTED 
                    || event_id == WIFI_EVENT_STA_STOP)
                )
            ){
            vTaskDelete(udp_task_handle);
            udp_task_handle=NULL;
            ESP_LOGI(TAG, "udp task end");
        }
 
        if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
            wifi_event_sta_disconnected_t *disconnected = (wifi_event_sta_disconnected_t*) event_data; 
            ESP_LOGE(TAG, "Wi-Fi 断开连接，原因码: %d", disconnected->reason); 
            ESP_LOGI(TAG, "  RSSI: %d", disconnected->rssi);
            if (s_retry_num < EXAMPLE_ESP_MAXIMUM_RETRY) {
                esp_wifi_connect();
                led_blink();
                s_retry_num++;
                ESP_LOGI(TAG, "retry to connect to the AP");
            } else {
                xEventGroupSetBits(s_wifi_event_group, WIFI_FAIL_BIT);
            }
        }
    } 
}

void wifi_init_sta(void)
{
    init_led(BLINK_GPIO,10*1000);
    led_blink();
    s_wifi_event_group = xEventGroupCreate();
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    ESP_ERROR_CHECK(esp_wifi_set_storage(WIFI_STORAGE_FLASH));
    //ESP_LOGE(TAG,"esp wifi set storage:%d",ret);
    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT,
                                                        ESP_EVENT_ANY_ID,
                                                        &event_handler,
                                                        NULL,
                                                        &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT,
                                                        IP_EVENT_STA_GOT_IP,
                                                        &event_handler,
                                                        NULL,
                                                        &instance_got_ip));

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA) );
    //ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config) );
    ESP_ERROR_CHECK(esp_wifi_start() );
    //esp_wifi_set_ps(WIFI_PS_NONE); 
    esp_wifi_set_max_tx_power(34); 
    //ESP_LOGI(TAG, "wifi_init_sta finished.");
    /* Waiting until either the connection is established (WIFI_CONNECTED_BIT) or connection failed for the maximum
     * number of re-tries (WIFI_FAIL_BIT). The bits are set by event_handler() (see above) */
    //xTaskCreatePinnedToCore(task_led, "led_task", 2048, NULL, 1, NULL, tskNO_AFFINITY);
    //EventBits_t 
    //EventBits_t s_bits =  
    xEventGroupWaitBits(s_wifi_event_group,
            WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
            pdFALSE,
            pdFALSE,
            portMAX_DELAY);
    
    /* xEventGroupWaitBits() returns the bits before the call returned, hence we can test which event actually
     * happened. 
    if (s_bits & WIFI_CONNECTED_BIT) {
        ESP_LOGI(TAG, "connected to ap SSID:%s password:%s",
                 EXAMPLE_ESP_WIFI_SSID, EXAMPLE_ESP_WIFI_PASS);
        //xTaskCreatePinnedToCore(task_led, "led_task", 2048,  &s_bits, 1, NULL, tskNO_AFFINITY);


    
    } else if (s_bits & WIFI_FAIL_BIT) {
        ESP_LOGI(TAG, "Failed to connect to SSID:%s, password:%s",
                 EXAMPLE_ESP_WIFI_SSID, EXAMPLE_ESP_WIFI_PASS);
    } else {
        ESP_LOGE(TAG, "UNEXPECTED EVENT");
    }*/
        

}