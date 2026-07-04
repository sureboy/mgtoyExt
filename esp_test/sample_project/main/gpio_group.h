#ifndef GPIOGROUP_H
#define GPIOGROUP_H
#include <stdlib.h>
#include "driver/gpio.h"
void gpio_group_init(gpio_num_t *gpios  );
void gpio_worker(uint8_t codeMsg,uint64_t timeout);
#endif