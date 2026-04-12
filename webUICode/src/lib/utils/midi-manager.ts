// src/lib/utils/midi-manager.ts
import { MidiParser } from './midiParser';
import type { MidiNote, ParsedMidiAction, MidiConfig } from './midi.types';

export type MidiEventListener = (action: ParsedMidiAction) => void;
export type MidiErrorListener = (error: Error) => void;
export type MidiStatusListener = (status: MidiManagerStatus) => void;

export interface MidiManagerStatus {
  isAvailable: boolean;
  isConnected: boolean;
  inputs: MIDIInput[];
  outputs: MIDIOutput[];
  selectedInput: string | null;
  selectedOutput: string | null;
}

export class MidiManager {
  private midiAccess: MIDIAccess | null = null;
  private parser: MidiParser;
  private eventListeners: Set<MidiEventListener> = new Set();
  private errorListeners: Set<MidiErrorListener> = new Set();
  private statusListeners: Set<MidiStatusListener> = new Set();
  
  private status: MidiManagerStatus = {
    isAvailable: false,
    isConnected: false,
    inputs: [],
    outputs: [],
    selectedInput: null,
    selectedOutput: null
  };
  
  constructor(config?: Partial<MidiConfig>) {
    this.parser = new MidiParser(config);
    this.checkMidiSupport();
  }
  
  /**
   * 检查MIDI支持
   */
  private checkMidiSupport(): void {
    this.status.isAvailable = !!(navigator as any).requestMIDIAccess;
    this.notifyStatusListeners();
  }
  
  /**
   * 初始化MIDI访问
   */
  async initialize(): Promise<boolean> {
    if (!this.status.isAvailable) {
      this.notifyError(new Error('Web MIDI API not supported'));
      return false;
    }
    
    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess();
      this.setupMidiAccess();
      this.status.isConnected = true;
      this.updateDeviceLists();
      this.notifyStatusListeners();
      return true;
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error('Failed to access MIDI'));
      return false;
    }
  }
  
  /**
   * 设置MIDI访问
   */
  private setupMidiAccess(): void {
    if (!this.midiAccess) return;
    
    // 监听设备连接/断开
    this.midiAccess.onstatechange = (event: any) => {
      this.updateDeviceLists();
      this.notifyStatusListeners();
    };
    
    // 自动连接第一个输入设备
    const inputs = this.midiAccess.inputs.values();
    const firstInput = inputs.next();
    
    if (!firstInput.done) {
      this.connectToInput(firstInput.value);
    }
  }
  
  /**
   * 更新设备列表
   */
  private updateDeviceLists(): void {
    if (!this.midiAccess) return;
    
    this.status.inputs = Array.from(this.midiAccess.inputs.values());
    this.status.outputs = Array.from(this.midiAccess.outputs.values());
  }
  
  /**
   * 连接到指定MIDI输入设备
   */
  connectToInput(input: MIDIInput): void {
    if (!input) return;
    
    // 移除现有的事件监听器
    if (this.status.selectedInput) {
      const oldInput = this.status.inputs.find(i => i.id === this.status.selectedInput);
      if (oldInput) {
        oldInput.onmidimessage = null;
      }
    }
    
    // 设置新的事件监听器
    input.onmidimessage = (event: MIDIMessageEvent) => {
      this.handleMidiMessage(event, input.name || input.id);
    };
    
    this.status.selectedInput = input.id;
    this.notifyStatusListeners();
  }
  
  /**
   * 处理MIDI消息
   */
  private handleMidiMessage(event: MIDIMessageEvent, source: string): void {
    try {
      const note = this.parser.parseMidiMessage(event.data);
      
      if (note) {
        note.source = source;
        const action = this.parser.mapNoteToAction(note);
        this.notifyEventListeners(action);
      }
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error('MIDI processing error'));
    }
  }
  
  /**
   * 断开当前连接
   */
  disconnect(): void {
    if (this.status.selectedInput) {
      const input = this.status.inputs.find(i => i.id === this.status.selectedInput);
      if (input) {
        input.onmidimessage = null;
      }
      this.status.selectedInput = null;
    }
    
    this.status.isConnected = false;
    this.notifyStatusListeners();
  }
  
  /**
   * 重置解析器
   */
  resetParser(): void {
    this.parser.reset();
  }
  
  /**
   * 更新解析器配置
   */
  updateParserConfig(config: Partial<MidiConfig>): void {
    this.parser.updateConfig(config);
  }
  
  /**
   * 获取当前状态
   */
  getStatus(): MidiManagerStatus {
    return { ...this.status };
  }
  
  /**
   * 添加事件监听器
   */
  addEventListener(listener: MidiEventListener): void {
    this.eventListeners.add(listener);
  }
  
  /**
   * 移除事件监听器
   */
  removeEventListener(listener: MidiEventListener): void {
    this.eventListeners.delete(listener);
  }
  
  /**
   * 添加错误监听器
   */
  addErrorListener(listener: MidiErrorListener): void {
    this.errorListeners.add(listener);
  }
  
  /**
   * 移除错误监听器
   */
  removeErrorListener(listener: MidiErrorListener): void {
    this.errorListeners.delete(listener);
  }
  
  /**
   * 添加状态监听器
   */
  addStatusListener(listener: MidiStatusListener): void {
    this.statusListeners.add(listener);
  }
  
  /**
   * 移除状态监听器
   */
  removeStatusListener(listener: MidiStatusListener): void {
    this.statusListeners.delete(listener);
  }
  
  /**
   * 通知事件监听器
   */
  private notifyEventListeners(action: ParsedMidiAction): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(action);
      } catch (error) {
        console.error('Error in MIDI event listener:', error);
      }
    });
  }
  
  /**
   * 通知错误监听器
   */
  private notifyError(error: Error): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (error) {
        console.error('Error in MIDI error listener:', error);
      }
    });
  }
  
  /**
   * 通知状态监听器
   */
  private notifyStatusListeners(): void {
    this.statusListeners.forEach(listener => {
      try {
        listener({ ...this.status });
      } catch (error) {
        console.error('Error in MIDI status listener:', error);
      }
    });
  }
  
  /**
   * 销毁管理器
   */
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.errorListeners.clear();
    this.statusListeners.clear();
    this.midiAccess = null;
  }
}