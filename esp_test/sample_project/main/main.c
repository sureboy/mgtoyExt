
#include "esp_log.h"
//#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
//#include "sdkconfig.h"
//#include "driver/gpio.h"
#include "nvs_flash.h"

//#include "wrapper.h" 
//#include "wifiScan.h" 
#include "InitializeParameters.h" 
#include "wifi.h"
//#include "driver/usb_serial_jtag.h"


//static TaskHandle_t stdin_task_handle = NULL;

 
 




/*
String generateRandomString(int length ) {
    //randomSeed(analogRead(0));
    const char charset[] = "abcdefhijkmnpqrstuvwxy345678";
    String result = "";
    int charsetLength = strlen(charset);          
    for (int i = 0; i < length; i++) {
        uint32_t randomValue = ESP.random();
        result += charset[randomValue % (sizeof(charset) - 1)];

        //int randomIndex = random(charsetLength);
        //result += charset[randomIndex];
    }          
    return result;
}*/

 
void app_main(void)
{
        //Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);


    xTaskCreate(
        task_InitializeParameters, "stdin_task", 2048*2, 
        NULL, 1,NULL);
    wifi_init_sta();
    
    //ESP_LOGI(TAG, "All tasks have been created.");
}
