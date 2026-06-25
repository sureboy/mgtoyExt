#include "wrapper.h"
#include "udp_server.hpp"
 

static udpServerClass* g_udp = nullptr;
static void (*g_callback)(char) = nullptr;

static void cpp_callback_wrapper(char m) {
    //led_blink();
    if (g_callback) g_callback(m);
}

void udp_server_init() {
    //init_led(led_pin);
    if (!g_udp) {
        g_udp = new udpServerClass(-1);
        g_udp->HandlerCallBack = cpp_callback_wrapper;
    }
}

void udp_server_set_addr(uint8_t a, uint8_t b, uint8_t c, uint8_t d,
                         unsigned int port, unsigned int control) {
    if (g_udp) {
        IPAddress ip(a, b, c, d);
        g_udp->setServerAddr(ip.addr(), htons(port), control);
    }
}

void udp_server_init_msg(char keepalive, const char* name, const char* local_ip) {
    if (g_udp) g_udp->initSendMsg(keepalive, name, local_ip);
}

void udp_server_set_callback(void (*callback)(char data)) {
    g_callback = callback;
    if (g_udp) g_udp->HandlerCallBack = cpp_callback_wrapper;
}

void udp_server_loop() {
    if (g_udp) g_udp->handleLoop();
}

void udp_server_send(uint8_t k) {
     if (g_udp) g_udp->Send(k);
}