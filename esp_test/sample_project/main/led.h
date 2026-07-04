#ifndef LED_H
#define LED_H
#include <stdlib.h>

void init_led (int led_pin,uint64_t timeout_us,uint8_t led_state);
void led_blink( uint64_t timeout_us);

#endif