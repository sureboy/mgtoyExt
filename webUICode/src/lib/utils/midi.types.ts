// types/midi-types.ts

// 基础类型
export interface MIDIFile {
  header: HeaderChunk;
  tracks: TrackChunk[];
  duration: DurationInfo;
}

export interface HeaderChunk {
  chunkType: string;
  length: number;
  format: MIDIFormat;
  numTracks: number;
  division: Division;
  isTicksPerBeat: boolean;
  ticksPerBeat: number;
  smpteFormat?: number;
  ticksPerFrame?: number;
}

export type MIDIFormat = 0 | 1 | 2;

export interface Division {
  raw: number;
  isTicksPerBeat: boolean;
  ticksPerBeat?: number;
  smpteFormat?: number;
  ticksPerFrame?: number;
}

export interface TrackChunk {
  chunkType: string;
  length: number;
  events: MIDIEvent[];
  trackIndex: number;
  getNotes(): NoteInfo[];
  getMetaEvents(): MetaEvent[];
}

// MIDI 事件基类
export interface MIDIEventBase {
  type: MIDIEventType;
  deltaTime: number;
  absoluteTime: number;
  statusByte: number;
  channel?: number;
  hex?: {
    status: string;
    [key: string]: string;
  };
}

// 音符事件
export interface NoteEvent extends MIDIEventBase {
  type: 'noteOn' | 'noteOff';
  noteNumber: number;
  noteName: string;
  velocity: number;
}

// 控制变更事件
export interface ControlChangeEvent extends MIDIEventBase {
  type: 'controlChange';
  controller: number;
  controllerName: string;
  value: number;
}

// 程序变更事件
export interface ProgramChangeEvent extends MIDIEventBase {
  type: 'programChange';
  program: number;
  instrument: string;
}

// 音色压力事件
export interface KeyPressureEvent extends MIDIEventBase {
  type: 'keyPressure';
  noteNumber: number;
  pressure: number;
}

// 通道压力事件
export interface ChannelPressureEvent extends MIDIEventBase {
  type: 'channelPressure';
  pressure: number;
}

// 弯音事件
export interface PitchBendEvent extends MIDIEventBase {
  type: 'pitchBend';
  value: number;
  normalizedValue: number;
}

// 系统事件
export interface SystemEvent extends MIDIEventBase {
  type: 'system';
  systemType: SystemEventType;
}

// 元事件
export interface MetaEvent extends MIDIEventBase {
  type: 'meta';
  metaType: number;
  metaTypeName: string;
  length: number;
  data?: any;
  text?: string;
}

export type MIDIEvent = 
  | NoteEvent
  | ControlChangeEvent
  | ProgramChangeEvent
  | KeyPressureEvent
  | ChannelPressureEvent
  | PitchBendEvent
  | SystemEvent
  | MetaEvent;

export type MIDIEventType = 
  | 'noteOn'
  | 'noteOff'
  | 'controlChange'
  | 'programChange'
  | 'keyPressure'
  | 'channelPressure'
  | 'pitchBend'
  | 'system'
  | 'meta';

export type SystemEventType =
  | 'systemExclusive'
  | 'midiTimeCode'
  | 'songPositionPointer'
  | 'songSelect'
  | 'tuneRequest'
  | 'endOfExclusive'
  | 'timingClock'
  | 'start'
  | 'continue'
  | 'stop'
  | 'activeSensing'
  | 'systemReset'
  | 'unknown';

// 音符信息
export interface NoteInfo {
  trackIndex: number;
  channel: number;
  noteNumber: number;
  noteName: string;
  start: number;
  end: number;
  duration: number;
  velocity: number;
  ticks: number;
}

// 持续时间信息
export interface DurationInfo {
  ticks: number;
  seconds?: number;
  bpm?: number;
  timebase?: number;
}

// 元数据
export interface SequenceInfo {
  title?: string;
  copyright?: string;
  tempo: TempoInfo[];
  timeSignatures: TimeSignature[];
  keySignatures: KeySignature[];
  markers: Marker[];
  lyrics: Lyric[];
}

export interface TempoInfo {
  time: number;
  tempo: number;
  bpm: number;
}

export interface TimeSignature {
  time: number;
  numerator: number;
  denominator: number;
  clocksPerClick: number;
  thirtySecondNotesPerQuarter: number;
}

export interface KeySignature {
  time: number;
  sharpsFlats: number;
  isMinor: boolean;
  key: string;
}

export interface Marker {
  time: number;
  text: string;
}

export interface Lyric {
  time: number;
  text: string;
}

// 轨道信息
export interface TrackInfo {
  index: number;
  name: string;
  instrument?: string;
  channel?: number;
  program?: number;
  eventCount: number;
  noteCount: number;
}

// 控制器常量
export enum Controller {
  BANK_SELECT = 0,
  MODULATION_WHEEL = 1,
  BREATH_CONTROLLER = 2,
  FOOT_CONTROLLER = 4,
  PORTAMENTO_TIME = 5,
  DATA_ENTRY_MSB = 6,
  VOLUME = 7,
  BALANCE = 8,
  PAN = 10,
  EXPRESSION = 11,
  SUSTAIN_PEDAL = 64,
  PORTAMENTO = 65,
  SOSTENUTO = 66,
  SOFT_PEDAL = 67,
  LEGATO_FOOTSWITCH = 68,
  ALL_SOUND_OFF = 120,
  RESET_ALL_CONTROLLERS = 121,
  LOCAL_CONTROL = 122,
  ALL_NOTES_OFF = 123,
  OMNI_MODE_OFF = 124,
  OMNI_MODE_ON = 125,
  MONO_MODE = 126,
  POLY_MODE = 127
}

// 乐器常量
export enum Instrument {
  ACOUSTIC_GRAND_PIANO = 0,
  BRIGHT_ACOUSTIC_PIANO = 1,
  ELECTRIC_GRAND_PIANO = 2,
  HONKY_TONK_PIANO = 3,
  ELECTRIC_PIANO_1 = 4,
  ELECTRIC_PIANO_2 = 5,
  HARPSICHORD = 6,
  CLAVINET = 7,
  CELESTA = 8,
  GLOCKENSPIEL = 9,
  MUSIC_BOX = 10,
  VIBRAPHONE = 11,
  MARIMBA = 12,
  XYLOPHONE = 13,
  TUBULAR_BELLS = 14,
  DULCIMER = 15
  // ... 更多乐器
}