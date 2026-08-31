// Sync por Bluetooth / Web Bluetooth API (local mesh)
export class BluetoothSync {
  constructor() {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
    this.CHAR_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
  }

  async scan() {
    if (!navigator.bluetooth) throw new Error('Web Bluetooth no soportado');
    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [this.SERVICE_UUID]
    });
    return this.device;
  }

  async connect() {
    if (!this.device) throw new Error('Primero escanee');
    this.server = await this.device.gatt.connect();
    const service = await this.server.getPrimaryService(this.SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(this.CHAR_UUID);
    return true;
  }

  async send(data) {
    if (!this.characteristic) throw new Error('No conectado');
    const encoder = new TextEncoder();
    const chunks = [];
    const json = JSON.stringify(data);
    for (let i = 0; i < json.length; i += 500) {
      chunks.push(json.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      await this.characteristic.writeValue(encoder.encode(chunk + '\n'));
    }
    return true;
  }

  async receive(callback) {
    if (!this.characteristic) throw new Error('No conectado');
    const decoder = new TextDecoder();
    let buffer = '';
    this.characteristic.addEventListener('characteristicvaluechanged', e => {
      const value = decoder.decode(e.target.value);
      buffer += value;
      if (buffer.includes('\n')) {
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          try { callback(JSON.parse(line)); } catch { /* ignore */ }
        }
      }
    });
    await this.characteristic.startNotifications();
  }

  disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
  }
}
