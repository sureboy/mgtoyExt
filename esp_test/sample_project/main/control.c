#include "control.h"
#define MASK 0x0F
static char controlGroup[10] = {1,2,3,4,5,6,7,8,9,0};
static int controlBool[15] = {0};
typedef void (*_Handle)(char);  
void initControl(char control){
    controlGroup[8] = control & MASK;
    controlGroup[4] = (control>>4) & MASK;
    controlGroup[2] = (controlGroup[8] ^ 0)& MASK;
    controlGroup[6] = (controlGroup[4] ^ 0)& MASK;
    controlGroup[7] = controlGroup[4] & controlGroup[8];
    controlGroup[9] = controlGroup[6] & controlGroup[8];
    controlGroup[3] = controlGroup[4] & controlGroup[2];
    controlGroup[1] = controlGroup[6] & controlGroup[2];
    controlGroup[0] = 0;
    controlGroup[5] = 15;
    for (int i=0;i<10;i++){
        controlBool[controlGroup[i]] = 1;
    }
}
int checkControl(int i){
    return controlBool[i];
}
char getControl(int i){
    return controlGroup[i];
}

void ControlStart(_Handle func){

}