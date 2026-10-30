/**
 * Human-facing metadata for catalog parts. The geometry comes from
 * wokwi-elements; titles and search terms are curated here.
 */
export type PartMeta = { title: string; category: string; keywords: string[] };

export const PART_META: Record<string, PartMeta> = {
  "arduino-uno": {
    title: "Arduino Uno",
    category: "board",
    keywords: ["uno", "atmega328p", "microcontroller"],
  },
  "arduino-nano": {
    title: "Arduino Nano",
    category: "board",
    keywords: ["nano", "atmega328p", "microcontroller"],
  },
  "arduino-mega": {
    title: "Arduino Mega 2560",
    category: "board",
    keywords: ["mega", "atmega2560", "microcontroller"],
  },
  "nano-rp2040-connect": {
    title: "Arduino Nano RP2040 Connect",
    category: "board",
    keywords: ["rp2040", "wifi", "microcontroller"],
  },
  "esp32-devkit-v1": {
    title: "ESP32 DevKit V1",
    category: "board",
    keywords: ["esp32", "wifi", "bluetooth", "microcontroller"],
  },
  franzininho: {
    title: "Franzininho",
    category: "board",
    keywords: ["attiny85", "microcontroller"],
  },
  led: { title: "LED", category: "output", keywords: ["light", "diode", "lamp"] },
  "rgb-led": { title: "RGB LED", category: "output", keywords: ["light", "color", "diode"] },
  "led-bar-graph": {
    title: "LED bar graph",
    category: "output",
    keywords: ["light", "level", "meter"],
  },
  "led-ring": {
    title: "NeoPixel ring",
    category: "output",
    keywords: ["ws2812", "addressable", "light"],
  },
  neopixel: {
    title: "NeoPixel (WS2812)",
    category: "output",
    keywords: ["ws2812", "addressable", "rgb"],
  },
  "neopixel-matrix": {
    title: "NeoPixel matrix",
    category: "output",
    keywords: ["ws2812", "matrix", "display"],
  },
  "7segment": {
    title: "7-segment display",
    category: "display",
    keywords: ["digit", "number", "display"],
  },
  lcd1602: { title: "LCD 16x2", category: "display", keywords: ["lcd", "hd44780", "text display"] },
  lcd2004: { title: "LCD 20x4", category: "display", keywords: ["lcd", "hd44780", "text display"] },
  ssd1306: { title: "OLED SSD1306", category: "display", keywords: ["oled", "i2c", "display"] },
  ili9341: { title: "TFT ILI9341", category: "display", keywords: ["tft", "spi", "color display"] },
  resistor: { title: "Resistor", category: "passive", keywords: ["ohm", "pull-up", "pull-down"] },
  potentiometer: {
    title: "Potentiometer",
    category: "input",
    keywords: ["knob", "pot", "variable resistor"],
  },
  "slide-potentiometer": {
    title: "Slide potentiometer",
    category: "input",
    keywords: ["fader", "slider", "pot"],
  },
  pushbutton: {
    title: "Push button",
    category: "input",
    keywords: ["button", "switch", "tactile"],
  },
  "pushbutton-6mm": {
    title: "Push button (6 mm)",
    category: "input",
    keywords: ["button", "switch", "tactile"],
  },
  "slide-switch": { title: "Slide switch", category: "input", keywords: ["switch", "toggle"] },
  "dip-switch-8": { title: "DIP switch (8)", category: "input", keywords: ["switch", "dip"] },
  "tilt-switch": { title: "Tilt switch", category: "sensor", keywords: ["tilt", "orientation"] },
  "ky-040": { title: "Rotary encoder KY-040", category: "input", keywords: ["encoder", "knob"] },
  "analog-joystick": {
    title: "Analog joystick",
    category: "input",
    keywords: ["joystick", "thumbstick"],
  },
  "membrane-keypad": {
    title: "Membrane keypad 4x4",
    category: "input",
    keywords: ["keypad", "keys"],
  },
  "rotary-dialer": { title: "Rotary dialer", category: "input", keywords: ["phone", "dial"] },
  "ir-receiver": { title: "IR receiver", category: "sensor", keywords: ["infrared", "remote"] },
  "ir-remote": { title: "IR remote", category: "input", keywords: ["infrared", "remote control"] },
  "hc-sr04": {
    title: "Ultrasonic sensor HC-SR04",
    category: "sensor",
    keywords: ["distance", "ultrasonic", "sonar"],
  },
  dht22: { title: "DHT22", category: "sensor", keywords: ["temperature", "humidity"] },
  "ntc-temperature-sensor": {
    title: "NTC temperature sensor",
    category: "sensor",
    keywords: ["temperature", "thermistor"],
  },
  "photoresistor-sensor": {
    title: "Photoresistor (LDR) module",
    category: "sensor",
    keywords: ["light", "ldr"],
  },
  "pir-motion-sensor": {
    title: "PIR motion sensor",
    category: "sensor",
    keywords: ["motion", "infrared"],
  },
  mpu6050: {
    title: "MPU-6050",
    category: "sensor",
    keywords: ["accelerometer", "gyroscope", "imu", "i2c"],
  },
  "gas-sensor": {
    title: "Gas sensor (MQ-2)",
    category: "sensor",
    keywords: ["gas", "smoke", "mq2"],
  },
  "flame-sensor": { title: "Flame sensor", category: "sensor", keywords: ["fire", "flame"] },
  "heart-beat-sensor": {
    title: "Heart beat sensor",
    category: "sensor",
    keywords: ["pulse", "heart"],
  },
  "big-sound-sensor": {
    title: "Sound sensor (big)",
    category: "sensor",
    keywords: ["microphone", "sound"],
  },
  "small-sound-sensor": {
    title: "Sound sensor (small)",
    category: "sensor",
    keywords: ["microphone", "sound"],
  },
  hx711: {
    title: "Load cell amplifier HX711",
    category: "sensor",
    keywords: ["weight", "scale", "load cell"],
  },
  ds1307: { title: "RTC DS1307", category: "module", keywords: ["clock", "rtc", "time", "i2c"] },
  "microsd-card": {
    title: "microSD card module",
    category: "module",
    keywords: ["sd", "storage", "spi"],
  },
  "ks2e-m-dc5": { title: "Relay KS2E-M-DC5", category: "output", keywords: ["relay", "switch"] },
  buzzer: { title: "Buzzer", category: "output", keywords: ["piezo", "sound", "beeper"] },
  servo: { title: "Servo motor", category: "output", keywords: ["servo", "motor", "sg90"] },
  "stepper-motor": {
    title: "Stepper motor",
    category: "output",
    keywords: ["stepper", "motor", "nema"],
  },
  "biaxial-stepper": {
    title: "Biaxial stepper",
    category: "output",
    keywords: ["stepper", "motor", "clock"],
  },
};

export function partMeta(type: string): PartMeta {
  return (
    PART_META[type] ?? {
      title: type.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()),
      category: "other",
      keywords: [],
    }
  );
}
