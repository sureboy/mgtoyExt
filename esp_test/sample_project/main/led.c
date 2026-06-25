#include "led.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_log.h"
esp_timer_handle_t led_timer=NULL;
gpio_num_t BLINK_GPIO;
uint8_t s_led_state = 1; 
void timer_callback(void *arg)
{
    // 100ms时间到，关闭LED
    s_led_state = 1;
    gpio_set_level(BLINK_GPIO, s_led_state);
    //ESP_LOGI("LED","close %d",BLINK_GPIO);
}
void init_led (int led_pin){
    BLINK_GPIO =(gpio_num_t) led_pin;
    gpio_reset_pin(BLINK_GPIO);
    /* Set the GPIO as a push/pull output */
    gpio_set_direction(BLINK_GPIO, GPIO_MODE_OUTPUT);
    esp_timer_create_args_t timer_args = {
        .callback = &timer_callback,
        .arg = NULL,
        .dispatch_method = ESP_TIMER_TASK,
        .name = "led_timer",
        .skip_unhandled_events = false,
    };
    esp_timer_create(&timer_args, &led_timer);
}
void led_blink(){
    //ESP_LOGI("LED","open %d",BLINK_GPIO);
    if (s_led_state==0){
        gpio_set_level(BLINK_GPIO, s_led_state);  
        esp_timer_restart(led_timer, 10 * 1000); 
        return;
    }
    s_led_state = 0;
    gpio_set_level(BLINK_GPIO, s_led_state);          // LED亮
    esp_timer_start_once(led_timer, 10 * 1000); 
    
}