#include "nvs_flash.h"
#include "nvs.h"

#define TAG "nvs"
/**
 * @brief 将字符串写入 NVS
 * @param namespace 命名空间（最多15字符）
 * @param key       键名（最多15字符）
 * @param value     要写入的字符串
 * @return ESP_OK 成功，其他失败
 */
esp_err_t write_nvs_str(const char *namespace, const char *key, const char *value)
{
    nvs_handle_t handle;
    esp_err_t err = nvs_open(namespace, NVS_READWRITE, &handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "nvs_open failed: %s", esp_err_to_name(err));
        return err;
    }

    err = nvs_set_str(handle, key, value);
    if (err == ESP_OK) {
        err = nvs_commit(handle);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "nvs_commit failed: %s", esp_err_to_name(err));
        }
    } else {
        ESP_LOGE(TAG, "nvs_set_str failed: %s", esp_err_to_name(err));
    }

    nvs_close(handle);
    return err;
}

/**
 * @brief 从 NVS 读取字符串
 * @param namespace 命名空间
 * @param key       键名
 * @param out_buf   输出缓冲区（调用者分配）
 * @param out_len   输入缓冲区大小，输出实际读取长度（含'\0'）
 * @return ESP_OK 成功；ESP_ERR_NVS_NOT_FOUND 键不存在；其他失败
 */
esp_err_t read_nvs_str(const char *namespace, const char *key, char *out_buf, size_t *out_len)
{
    nvs_handle_t handle;
    esp_err_t err = nvs_open(namespace, NVS_READONLY, &handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "nvs_open failed: %s", esp_err_to_name(err));
        return err;
    }

    err = nvs_get_str(handle, key, out_buf, out_len);
    if (err != ESP_OK && err != ESP_ERR_NVS_NOT_FOUND) {
        ESP_LOGE(TAG, "nvs_get_str failed: %s", esp_err_to_name(err));
    }
    nvs_close(handle);
    return err;
}