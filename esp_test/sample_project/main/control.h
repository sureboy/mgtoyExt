
#ifndef CONTROL_H
#define CONTROL_H
//#include <stdlib.h>
typedef void (*_Handle)(char,int);  
void InitControl(char control); 
char CheckControl(int i ,_Handle worker );
void AutoAvoid();
#endif