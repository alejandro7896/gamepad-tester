# Gamepad Tester - El Taller de Alex

Este es el Gamepad Tester desarrollado y utilizado en **El Taller de Alex** para probar controles y dispositivos de entrada. Ahora lo hacemos disponible públicamente para que puedas verificar el estado de tus gamepads de forma rápida y sencilla.

## Características

- 🎮 Detecta y muestra el estado de los botones, joysticks y triggers en tiempo real.
- 📊 Muestra datos de eje y valores de presión de botones.
- 🖥️ Interfaz minimalista y responsiva.
- ✅ Compatible con la mayoría de los gamepads y joysticks que se conectan nativamente a Windows.
- 🚫 Sin molestos anuncios y totalmente optimizado.
- 🔊 *Nuevo:* Prueba de vibración por motor individual para ajustes más precisos.
- 🔊 *Nuevo:* Prueba de vibración por cada gatillo. _Disponible únicamente en la versión web_.
- 🔍 *Nuevo:* Opción de cambiar entre 2 y 3 decimales en los valores, ideal para calibración avanzada o debugging técnico.

## Uso web

👉 [Usalo directamente desde web a un solo click](https://alejandro7896.github.io/gamepad-tester/)

## ¿Quieres tenerlo en tu PC y no quieres complicarte?

Si no quieres batallar con la conexión a internet en cada uso, puedes descargar nuestra versión para **Windows**. Es el mismo código, únicamente empaquetado en un ejecutable .exe:

👉 [Descargar desde El Taller de Alex](https://www.eltallerdealex.com.mx/gamepad_tester)

¡Es totalmente gratis! Solo necesitas registrarte con un correo electrónico válido para obtener acceso.

## Las actualizaciones son publicadas en el canal de Telegram:

👉 [Mantente al corriente de las actualizaciones (Grupo de Telegram)](https://t.me/GamepadTester)

## Para desarrolladores

Puedes clonar el repositorio y simplemente abrir el archivo `index.html` en tu navegador favorito.

```bash
git clone https://github.com/alejandro7896/gamepad-tester.git
cd gamepad-tester
index.html
```

## Diagnóstico guiado (rama de desarrollo)

Desde la página principal puedes seleccionar controles conectados y ejecutar pruebas orientativas:

- **Centro (2 s):** suelta el joystick. Se calcula el promedio X/Y, desplazamiento central, máximo observado y ruido RMS.
- **Retorno:** lleva el joystick al menos al 70 % de recorrido, suéltalo y mantenlo en la zona central (radio 30 %) durante 500 ms. El intento caduca a los 15 s.
- **Recorrido:** mueve el joystick en cuatro direcciones y pulsa «Finalizar recorrido». Se registran máximos direccionales.
- **Gatillos:** acciona LT/L2 y RT/R2 para registrar máximos y mínimos observados.
- **Botones:** pulsa cada botón al menos una vez. Los botones de sistema pueden no estar expuestos por el navegador.

Las mediciones específicas de joysticks y gatillos exigen mapeo estándar (mapping = standard), cuatro ejes y 16 botones. Para dispositivos no estándar, se conservan los valores crudos y el test genérico de botones.

> **Limitación:** las lecturas de la Gamepad API no prueban por sí solas daños físicos. La calibración, el firmware, los drivers y el navegador pueden cambiar resultados o impedir el uso de vibración.

### Pruebas automatizadas

Con Node.js 22 ejecuta: `node --test tests/*.test.cjs`.

GitHub Actions comprueba los cálculos y la sintaxis del JavaScript, pero no sustituye pruebas manuales con controles conectados.

### Pruebas manuales sugeridas

1. Abre el sitio por HTTPS. Conecta un control y presiona un botón para activarlo.
2. Selecciona cada control conectado (también prueba con dos y desconectando uno). Confirma los valores, el SVG y el osciloscopio.
3. Alterna entre dos y tres decimales. Inicia y detén el osciloscopio varias veces.
4. Ejecuta mediciones de centro, retorno, recorrido, gatillos y todos los botones.
5. Verifica motores y vibración de gatillos solamente en dispositivos/navegadores que declaren soporte.
