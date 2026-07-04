#include "led.h"
#include "driver/gpio.h"
#include "esp_timer.h"
#include "esp_log.h"
static esp_timer_handle_t led_timer=NULL;
static gpio_num_t BLINK_GPIO;
static uint8_t s_led_state = 1; 
//static uint64_t timeout_us = 10*1000;
static void timer_callback(void *arg)
{
    // 100ms时间到，关闭LED
    //s_led_state = !s_led_state;
    gpio_set_level(BLINK_GPIO, s_led_state);
    //ESP_LOGI("LED","close %d",BLINK_GPIO);
}
void init_led (int led_pin,uint64_t timeout,uint8_t led_state){
    BLINK_GPIO =(gpio_num_t) led_pin;
    gpio_reset_pin(BLINK_GPIO);
    //timeout_us=timeout;
    s_led_state= led_state;
    /* Set the GPIO as a push/pull output */
    gpio_set_direction(BLINK_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(BLINK_GPIO, s_led_state); 
    esp_timer_create_args_t timer_args = {
        .callback = &timer_callback,
        .arg = NULL,
        .dispatch_method = ESP_TIMER_TASK,
        .name = "led_timer",
        .skip_unhandled_events = false,
    };
    
    esp_timer_create(&timer_args, &led_timer);
}
void led_blink( uint64_t timeout_us){
    //ESP_LOGI("LED","open %d",BLINK_GPIO);
    timeout_us *=1000;
    gpio_set_level(BLINK_GPIO, !s_led_state);  
    if (esp_timer_is_active(led_timer)){
        
        esp_timer_restart(led_timer, timeout_us); 
        return;
    }
    //s_led_state = !s_led_state;
    //gpio_set_level(BLINK_GPIO, s_led_state);          // LED亮
    esp_timer_start_once(led_timer, timeout_us); 
    
}