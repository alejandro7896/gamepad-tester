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
- **Retorno:** lleva el joystick al menos al 70 % de recorrido, suéltalo y mantenlo en la zona central (radio 15 %) durante 500 ms. El intento caduca a los 15 s.
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

### Pantalla visual en vivo

El diagnóstico guiado se presenta **debajo del tester y el osciloscopio**. Los círculos dibujan los ejes X/Y en tiempo real. El punto y el porcentaje están **verdes hasta el 15 %**, **rojos entre el 15 % y el recorrido completo**, y vuelven a **verde al alcanzar aproximadamente 100 %** (tolerancia desde 99.5 %) de magnitud radial, medida como √(X²+Y²). Este cambio de color **no implica automáticamente drift** cuando el joystick se mueve de forma voluntaria; la prueba de centro sirve para observar el reposo. Hay además barras gráficas de gatillos y botones que se iluminan al activarse.

La promoción de noviembre de 2026 utiliza el cupón de instructor **NOVIEMBRE26**, aplicado directamente en el enlace al curso mediante `couponCode=NOVIEMBRE26`, además de parámetros UTM de campaña. El precio final y la vigencia los determina Udemy.

### Osciloscopio optimizado

El osciloscopio usa ahora **Canvas 2D sin Chart.js**, con historial limitado a 300 muestras y una única función de animación. Captura por fotograma (hasta ~120 Hz si la pantalla y el navegador lo permiten) y dibuja hasta ~60 FPS, evitando cuatro actualizaciones completas de Chart.js por ciclo. Si el navegador reduce los FPS, la frecuencia real también puede reducirse. Hay que validar la fluidez y la selección de dispositivos con un control físico.

Los botones y los contenedores de prueba de vibración conservan bordes redondeados.

### Cruceta: alerta por pulsaciones repetidas

El panel de diagnóstico incluye un **monitor de la cruceta** para controles con mapeo Gamepad API `standard` (botones 12–15). Observa automáticamente cada dirección (arriba, abajo, izquierda, derecha) utilizando el ciclo de lectura del navegador.

- Cuenta únicamente transiciones reales de **liberado a presionado**; una dirección sostenida durante muchos fotogramas cuenta una sola vez.
- Usa una ventana móvil de 1 segundo: **5 o más pulsaciones** y frecuencia calculada **superior a 4 Hz** generan una alerta de **posible cruceta dañada** para esa dirección.
- La alerta persiste hasta pulsar **Reiniciar prueba**, que borra los contadores y evita contar erróneamente una pulsación que esté sostenida.
- Las pulsaciones deliberadamente rápidas también pueden activar la alerta. El navegador puede perder rebotes más rápidos que su frecuencia de lectura. Algunos controles representan la cruceta como ejes o POV, no como botones estándar.

**No confirma una falla física**; es una indicación para repetir la prueba sin mover voluntariamente el control. El monitoreo es independiente del checklist manual de todos los botones.
