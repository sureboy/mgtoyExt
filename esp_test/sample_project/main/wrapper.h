#ifndef WRAPPER_H
#define WRAPPER_H
#include <stdint.h> 
//#include "led.h"
#ifdef __cplusplus
extern "C" {
#endif

void udp_server_init( );
void udp_server_set_addr(uint8_t a, uint8_t b, uint8_t c, uint8_t d,
                         unsigned int port, unsigned int control);
void udp_server_init_msg(char keepalive, const char* name, const char* local_ip);
void udp_server_set_callback(void (*callback)(char data));
void udp_server_loop();
void udp_server_send(uint8_t k) ;
void udp_server_sendData(char * data,const int len) ;
#ifdef __cplusplus
}
#endif
#endif