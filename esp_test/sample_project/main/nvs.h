#ifndef NVS_H
#define NVS_H
#include "esp_log.h"
#define NVS_KEY "udp_data"
#define NVS_NAMESPACE "storage"
esp_err_t write_nvs_str(const char *namespace, const char *key, const char *value);
esp_err_t write_nvs_u32(const char *namespace, const char *key, uint32_t value);
esp_err_t read_nvs_str(const char *namespace, const char *key, char *out_buf, size_t *out_len);
esp_err_t read_nvs_u32(const char *namespace, const char *key, uint32_t *out_value);
#endif