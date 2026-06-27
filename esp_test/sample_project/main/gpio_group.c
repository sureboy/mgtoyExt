#include "gpio_group.h"

#include "esp_timer.h"
#include "esp_log.h"
//#include "led.h"
static gpio_num_t GPIOS[] = {GPIO_NUM_0, GPIO_NUM_1, GPIO_NUM_3, GPIO_NUM_10};
static esp_timer_handle_t timer[4];
static uint64_t gpio_timeout_us = 3*1000*1000;

static void gpio_timer_callback(void *arg)
{
    //ledc_channel_config_t *params = (ledc_channel_config_t*)arg;
    //set_pwm_duty( 0,params->channel);
    gpio_num_t led_pin = (gpio_num_t)arg;  
    gpio_set_level(led_pin, 0);
    ESP_LOGI("TAG", "Channel: %d ", led_pin);
}

void init_gpio (gpio_num_t led_pin,int index){
    //BLINK_GPIO =(gpio_num_t) led_pin;
    gpio_reset_pin(led_pin);

    /* Set the GPIO as a push/pull output */
    gpio_set_direction(led_pin, GPIO_MODE_OUTPUT);
    gpio_set_level(led_pin, 0); 
    esp_timer_create_args_t timer_args = {
        .callback = &gpio_timer_callback,
        .arg = (void*)led_pin,
        .dispatch_method = ESP_TIMER_TASK,
        .name = "led_timer",
        .skip_unhandled_events = false,
    }; 
    esp_timer_create(&timer_args, &(timer[index]));
}
void gpio_blink(int i){
    //ESP_LOGI("LED","open %d",BLINK_GPIO);
    
    gpio_set_level(GPIOS[i], 1);  
    if (esp_timer_is_active(timer[i])){
        
        esp_timer_restart(timer[i], gpio_timeout_us); 
        return;
    }
    //s_led_state = !s_led_state;
    //gpio_set_level(BLINK_GPIO, s_led_state);          // LED亮
    esp_timer_start_once(timer[i], gpio_timeout_us); 
    
}
void gpio_group_init(gpio_num_t *gpios,uint64_t timeout  ){
    gpio_timeout_us=timeout;
    //s_led_state= led_state;
    for (int i=0;i<4;i++){
        GPIOS[i] = gpios[i];
        init_gpio(gpios[i],i);
    }
}
void gpio_worker(uint8_t codeMsg){
    ESP_LOGI("PWM","Work %d",codeMsg);
    for (int i = 0; i < 4; i++) {
        bool level = (codeMsg >> i) & 1;
        if (level){
            gpio_blink( i);
            ESP_ERROR_CHECK(esp_timer_is_active(timer[i])?esp_timer_restart(timer[i], gpio_timeout_us):esp_timer_start_once(timer[i], gpio_timeout_us)); 
            //ledc_stop(LEDC_LOW_SPEED_MODE,i);
            ESP_LOGI("PWM", "Channel: %d ", i );
        }else{
            gpio_set_level(GPIOS[i], 0);  
            //gpio_blink( i);
        } 

    }
}