#include "control.h"
#include "esp_timer.h"
#define MASK 0x0F
static char controlGroup[10] = {1,2,3,4,5,6,7,8,9,0};
static char controlBool[15] = {0};
//static char controlStartKey[4]={6,2,4,8};
int controlStartKeyIndex = 0;
static _Handle autoWorker;
static char AvoidValue = 0;
static esp_timer_handle_t AvoidTimer;
//static esp_timer_handle_t ExitTimer;
static uint64_t Avoid_timeout_us = 1*1000*1000/8;
void autoStart(){
    if (autoWorker){
        autoWorker(controlGroup[8],0);
    }
    //AvoidValue = AvoidValue^0x0F;// & 0x0F;
}
/*
static void exit_timer_callback(void *arg)
{
    //ledc_channel_config_t *params = (ledc_channel_config_t*)arg;
    //set_pwm_duty( 0,params->channel);
    //gpio_num_t led_pin = (gpio_num_t)arg;  
    //gpio_set_level(led_pin, 0);
    //ESP_LOGI("TAG", "Channel: %d ", led_pin);
    //autoStart();
    autoWorker( AvoidValue,0);
    esp_timer_start_once(AvoidTimer, Avoid_timeout_us); 
}*/
static void timer_callback(void *arg)
{
    //ledc_channel_config_t *params = (ledc_channel_config_t*)arg;
    //set_pwm_duty( 0,params->channel);
    //gpio_num_t led_pin = (gpio_num_t)arg;  
    //gpio_set_level(led_pin, 0);
    //ESP_LOGI("TAG", "Channel: %d ", led_pin);
    autoStart();
}
/*
void initExit(){
    //AvoidValue = controlGroup[4] | (1<<4);
    //Avoid_timeout_us = timeout_us/8 ;
    esp_timer_create_args_t timer_args = {
        .callback = &exit_timer_callback,
        .arg = nullptr,
        .dispatch_method = ESP_TIMER_TASK,
        .name = "Exit_timer",
        .skip_unhandled_events = false,
    }; 
    esp_timer_create(&timer_args, &ExitTimer );

}*/
void initAvoid(uint64_t timeout_us){
    AvoidValue = controlGroup[4] | (1<<4);
    Avoid_timeout_us = timeout_us ;
    esp_timer_create_args_t timer_args = {
        .callback = &timer_callback,
        .arg = nullptr,
        .dispatch_method = ESP_TIMER_TASK,
        .name = "Avoid_timer",
        .skip_unhandled_events = false,
    }; 
    esp_timer_create(&timer_args, &AvoidTimer );
    //initExit();
}

void InitControl(char control){
    
    controlGroup[8] = control & MASK;
    controlGroup[4] = (control>>4) & MASK;
    controlGroup[2] = (controlGroup[8] ^ MASK)& MASK;
    controlGroup[6] = (controlGroup[4] ^ MASK)& MASK;
    controlGroup[7] = controlGroup[4] & controlGroup[8];
    controlGroup[9] = controlGroup[6] & controlGroup[8];
    controlGroup[3] = controlGroup[4] & controlGroup[2];
    controlGroup[1] = controlGroup[6] & controlGroup[2];
    controlGroup[0] = 0;
    controlGroup[5] = 15;
    initAvoid(1000*1000);
    for (int i=0;i<10;i++){
        controlBool[(int)(controlGroup[i])] = (char)i;
    }
}
//void InitAvoid(){
//    AvoidValue = ((AvoidValue ^ MASK) & MASK )| (1<<4);
//}
 
void AutoAvoid(){
    if (!autoWorker){
        return;
    }
    
    autoWorker( AvoidValue,0);
    esp_timer_start_once(AvoidTimer, Avoid_timeout_us); 
    char k = AvoidValue >>4;
    if (k==0){
        //controlGroup[2]
        //autoWorker(controlGroup[2],0);
        //esp_timer_start_once(ExitTimer, Avoid_timeout_us); 
        //k = 1;
        //InitAvoid();
        //AvoidValue = ((AvoidValue ^ MASK) & MASK )| (1<<4);
        InitControl((AvoidValue<<4)|controlGroup[2]); 
    }else{ 
        AvoidValue = ((k<<1) << 4) | ((AvoidValue ^ MASK)&MASK); 
    }
    
    
}
char CheckControl(int i,_Handle worker  ){
    //i &=0x0F;
    //if ((i & 0x0F)>0)
    //return controlGroup[i];
    if (i==8){
        if (!autoWorker){
            autoWorker = worker;
            autoStart();
            return 0;
        }   

    } else{
        if (autoWorker){
            autoWorker=NULL;
        }
    }
    
    return controlGroup[i];
    
    
}
 

