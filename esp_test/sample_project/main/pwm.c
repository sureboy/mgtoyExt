#include "driver/ledc.h"
#include "esp_err.h"
#include "pwm.h"
#include "esp_timer.h" 
#include "esp_log.h"
//GPIO_NUM_0, GPIO_NUM_1, GPIO_NUM_3, GPIO_NUM_10
//#define PWM_GPIO        GPIO_NUM_2
#define PWM_FREQ        5000            // 5 KHz
#define PWM_RESOLUTION  LEDC_TIMER_8_BIT // 10-bit 分辨率
static gpio_num_t PWMS[] = {GPIO_NUM_0, GPIO_NUM_1, GPIO_NUM_3, GPIO_NUM_10};
static esp_timer_handle_t timer[4];
static uint64_t pwm_timeout_us = 3*1000*1000;
 
/*
    duty = 0-1023;
*/
static void set_pwm_duty(uint32_t duty,ledc_channel_t channel) {
    // 设置占空比后，必须调用 ledc_update_duty 使设置生效
    ESP_ERROR_CHECK(ledc_set_duty(LEDC_LOW_SPEED_MODE, channel, duty));
    ESP_ERROR_CHECK(ledc_update_duty(LEDC_LOW_SPEED_MODE, channel));
}
static void pwm_timer_callback(void *arg)
{
    ledc_channel_config_t *params = (ledc_channel_config_t*)arg;
    
    set_pwm_duty( 0,params->channel);
    //ESP_LOGI("TAG", "Channel: %d, Duty: %d", params->channel, params->duty);
}
static void pwm_init(gpio_num_t PWM_GPIO,ledc_channel_t channel) {
    // 1. 定时器配置
    ledc_channel_config_t *channel_conf = malloc(sizeof(ledc_channel_config_t));
    // 2. 通道配置
    channel_conf->channel = channel;
    channel_conf->gpio_num = PWM_GPIO;
    channel_conf->speed_mode = LEDC_LOW_SPEED_MODE;
    channel_conf->timer_sel = LEDC_TIMER_0;
    channel_conf->duty = 0;
    channel_conf->hpoint = 0;
    /*
    ledc_channel_config_t channel_conf = {
        .gpio_num       = PWM_GPIO,
        .speed_mode     = LEDC_LOW_SPEED_MODE, // ESP32-C3 必须为低速模式
        .channel        = channel, //LEDC_CHANNEL_0,
        .timer_sel      = LEDC_TIMER_0,
        .duty           = 0,
        .hpoint         = 0
    };*/
    ESP_ERROR_CHECK(ledc_channel_config(channel_conf));  
    esp_timer_create_args_t timer_args = {
        .callback = pwm_timer_callback,
        .arg = (void *)channel_conf,  // 传递结构体指针
        .dispatch_method = ESP_TIMER_TASK,
        .name = "pwm_timer" ,
        .skip_unhandled_events = false,
    };

    //sprintf(timer_args.name, "timer%d",  channel); 
    esp_timer_create(&timer_args, &timer[channel]);

}


void pwm_group_init(gpio_num_t *pwms ){

    ledc_timer_config_t timer_conf = {
        .speed_mode       = LEDC_LOW_SPEED_MODE, // ESP32-C3 必须为低速模式
        .timer_num        = LEDC_TIMER_0,
        .duty_resolution  = PWM_RESOLUTION,
        .freq_hz          = PWM_FREQ,
        .clk_cfg          = LEDC_AUTO_CLK
    };
    ESP_ERROR_CHECK(ledc_timer_config(&timer_conf));
    for (int i=0;i<4;i++){
        PWMS[i] = pwms[i];
        pwm_init(pwms[i],i);
    }
}

void pwm_worker(uint8_t codeMsg){
    ESP_LOGI("PWM","Work %d",codeMsg);
    for (int i = 0; i < 4; i++) {
        bool level = (codeMsg >> i) & 1;
        if (level){
            set_pwm_duty( 255,i);
            ESP_ERROR_CHECK(esp_timer_is_active(timer[i])?esp_timer_restart(timer[i], pwm_timeout_us):esp_timer_start_once(timer[i], pwm_timeout_us)); 
            //ledc_stop(LEDC_LOW_SPEED_MODE,i);
            ESP_LOGI("PWM", "Channel: %d ", i );
        }else{
            set_pwm_duty(0,i);
        }
        
        //gpio_set_level(PWMS[i], level ? 255 : 0);
    }
}