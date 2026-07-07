#ifndef UDP_SERVER_HPP
#define UDP_SERVER_HPP

#include <functional>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <esp_log.h>
#include <driver/gpio.h>
#include <esp_timer.h>
#include <errno.h>

#define UDP_LOG_TAG "UDP_SERVER"

// 简单 IP 地址类（兼容原接口）
class IPAddress {
public:
    IPAddress() : _addr(0) {}
    IPAddress(uint8_t a, uint8_t b, uint8_t c, uint8_t d) {
        _addr = (uint32_t)a << 24 | (uint32_t)b << 16 | (uint32_t)c << 8 | d;
    }
    uint32_t addr() const { return htonl(_addr); }  // 网络字节序
    void getBytes(uint8_t buf[4]) const {
        buf[0] = (_addr >> 24)  ;
        buf[1] = (_addr >> 16) ;
        buf[2] = (_addr >> 8) ;
        buf[3] = _addr  ;
    }
private:
    uint32_t _addr;
};

typedef std::function<void(char)> HandlerCallBackFunction;

class udpServerClass {
public:
    // 构造函数：ledPin 为 -1 则禁用 LED
    udpServerClass(int ledPin = -1)
        : _sock(-1),
          _ledPin(ledPin),
          _control(255),
          timeOut(1000),
          startTime(0)
          //serverIP(192, 168, 0, 11),   // 默认 IP
          //serverPort(9002)
    {
        // 创建 UDP socket
        _sock = socket(AF_INET, SOCK_DGRAM, 0);
        if (_sock < 0) {
            ESP_LOGE(UDP_LOG_TAG, "Socket creation failed");
            return;
        }
        // 绑定任意端口（类似 WiFiUDP.begin(0)）
        struct sockaddr_in localAddr;
        localAddr.sin_family = AF_INET;
        localAddr.sin_addr.s_addr = INADDR_ANY;
        localAddr.sin_port = 0;
        if (bind(_sock, (struct sockaddr*)&localAddr, sizeof(localAddr)) < 0) {
            ESP_LOGE(UDP_LOG_TAG, "Bind failed");
            close(_sock);
            _sock = -1;
        }
        // 设置接收超时（100ms）
        struct timeval tv;
        tv.tv_sec = 0;
        tv.tv_usec = 100000;
        setsockopt(_sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

        // 默认回调
        HandlerCallBack = [this](char m) {
            ESP_LOGI(UDP_LOG_TAG, "Received callback: 0x%02X", (uint8_t)m);
        };

        // 初始化 LED
        if (_ledPin >= 0) {
            gpio_reset_pin((gpio_num_t)_ledPin);
            gpio_set_direction((gpio_num_t)_ledPin, GPIO_MODE_OUTPUT);
        }

        memset(sendMsg, 0, sizeof(sendMsg));
        memset(packetBuffer, 0, sizeof(packetBuffer));
        ESP_LOGI(UDP_LOG_TAG,"create");
    }

    ~udpServerClass() {
        if (_sock >= 0) close(_sock);
    }

    void setControl(unsigned int c) {
        _control = (uint8_t)c;
    }

    void setServerAddr(const in_addr_t ServerIp =0,
                       const in_port_t Port = 9002,
                       unsigned int control = (1 | (1<<2)) | ((1 | (2<<2)) << 4))
    {
        destAddr.sin_family = AF_INET;
        destAddr.sin_port = Port;
        destAddr.sin_addr.s_addr = ServerIp; 
        //serverIP = ip;
        //serverPort = Port;
        _control = (uint8_t)control;
    }

    void handleLoop() {
        udpRead();
        /*
        if (!sendMsg[0]) return;
        
        uint64_t now_ms = esp_timer_get_time() / 1000;
        if (now_ms - startTime > timeOut) {
            //ESP_LOGI(UDP_LOG_TAG,"udpSend");
            udpSend();
            startTime = now_ms;
        }
            */
    }

    void initSendMsg(char keepalive, const char* name = nullptr, const char* localIP = nullptr) {
        memset(sendMsg, 0, sizeof(sendMsg));
        sendMsg[0] = keepalive;
        sendMsg[1] = _control;
        char size = 2;
        if (name) {
            size_t len = strlen(name);
            if (len >= 6) {
                memcpy(sendMsg + size, name + (len - 6), 6);
                size += 6;
            }
        }
        if (localIP) {
            char len = sizeof(localIP);            
            memcpy(sendMsg+size,localIP,len); 
            size += len; 

            //char len = strlen(localIP);
            //ESP_LOGI(UDP_LOG_TAG,"localIP len=%d",len);
            //if (len > 0 && size + len < sizeof(sendMsg)) {
            //    memcpy(sendMsg + size, localIP, len);
            //    size += len;
            //}
        }
        sendMsg[12]=0;
    }
    void Send(uint8_t k){
        udpSend(k);
    }
    void SendData(const char * data,const int len){
        updateNum();
        sendBigMsg[0]=sendMsg[0];
        memcpy(&(sendBigMsg[1]),data,len);
        ssize_t sent = sendto(_sock, sendBigMsg, len+1, 0,
                        (struct sockaddr*)&destAddr, sizeof(destAddr));
        if (sent < 0) {
            ESP_LOGE(UDP_LOG_TAG, "sendto failed: errno %d", errno);
        } else {
            ESP_LOGD(UDP_LOG_TAG, "Sent %d bytes", sent); 
        }
    }

    HandlerCallBackFunction HandlerCallBack;

private:
    int _sock;
    int _ledPin;
    uint8_t _control;
    uint16_t timeOut;
    unsigned long startTime;
    //IPAddress serverIP;          // 成员变量
    //unsigned int serverPort;
    char sendMsg[13];
    char sendBigMsg[1400];
    char packetBuffer[2];
    struct sockaddr_in destAddr;

    void udpSend(uint8_t k=0) {
        if (_sock < 0) return;
        
        //destAddr.sin_family = AF_INET;
        //destAddr.sin_port = htons(serverPort);
        //destAddr.sin_addr.s_addr = serverIP.addr();   // 使用成员变量
        if (k==0){
            updateNum();
        }else{
            sendMsg[0] = k;
        }
        
        ssize_t sent = sendto(_sock, sendMsg, sizeof(char)*strlen(sendMsg), 0,
                              (struct sockaddr*)&destAddr, sizeof(destAddr));
        if (sent < 0) {
            ESP_LOGE(UDP_LOG_TAG, "sendto failed: errno %d", errno);
        } else {
            ESP_LOGD(UDP_LOG_TAG, "Sent %d bytes", sent);
            setHeartBeatMsg();
            if (_ledPin >= 0) gpio_set_level((gpio_num_t)_ledPin, 0);
        }
        //uint8_t bytes[4];
        //serverIP.getBytes(bytes);
        //ESP_LOGI("TAG", "IP: %d.%d.%d.%d", bytes[0], bytes[1], bytes[2], bytes[3]);
        ESP_LOGI(UDP_LOG_TAG,
            "udpSend %d-%d %d %d",
            sent,sendMsg[0],sendMsg[1] ,sizeof(sendMsg[0])*strlen(sendMsg)
        );
    }

    void udpRead() {
        if (_sock < 0) return;
        struct sockaddr_in srcAddr;
        socklen_t addrLen = sizeof(srcAddr);
        ssize_t len = recvfrom(_sock, packetBuffer, sizeof(packetBuffer), 0,
                               (struct sockaddr*)&srcAddr, &addrLen);
        if (len < 0) {
            if (errno != EAGAIN && errno != EWOULDBLOCK) {
                ESP_LOGE(UDP_LOG_TAG, "recvfrom error: %d", errno);
            }
            return;
        }
        if (len == 0) return;
        if (len == 2 ){
            replyMessage(packetBuffer[1]);
        }
        if (packetBuffer[0] != sendMsg[0]) {
            
            //ESP_LOGI(UDP_LOG_TAG, "Received reply order 0x%02X", (uint8_t)packetBuffer[1]);
        //} else {
            setHeartBeatMsg();
            ESP_LOGW(UDP_LOG_TAG, "Order mismatch, sent:0x%02X, recv:0x%02X",
                    (uint8_t)sendMsg[0], (uint8_t)packetBuffer[0]);
            //if (HandlerCallBack) HandlerCallBack(0xF0);
        }
         
    }

    void replyMessage(char m) {
        if (HandlerCallBack) HandlerCallBack(m);
        if ((m & 0xF0) == 0xF0) {
            setDataMsg();
            startTime = 0;
        }
    }

    void updateNum() {
        sendMsg[0]++;
        if (sendMsg[0] == 0) sendMsg[0] = 1;
    }

    void setHeartBeatMsg() {
        sendMsg[1] = 0;
    }

    void setDataMsg() {
        sendMsg[1] = _control;
        udpSend(0);
    }
};

#endif // UDP_SERVER_HPP