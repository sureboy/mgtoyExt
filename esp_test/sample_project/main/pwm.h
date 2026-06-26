#include <stdlib.h>
#include "driver/gpio.h"
//void pwm_init(gpio_num_t PWM_GPIO,ledc_channel_t channel);
//void set_pwm_duty(uint32_t duty,ledc_channel_t channel);
void pwm_group_init(gpio_num_t *pwms );
void pwm_worker(uint8_t codeMsg);