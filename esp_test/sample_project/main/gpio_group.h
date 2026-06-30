#ifndef GPIOGROUP_H
#define GPIOGROUP_H
#include <stdlib.h>
#include "driver/gpio.h"
void gpio_group_init(gpio_num_t *gpios,uint64_t timeout  );
void gpio_worker(uint8_t codeMsg,bool control);
#endif