define(['postmonger'], function (Postmonger) {
    'use strict';

    // Inicializa la conexión con Journey Builder
    var connection = new Postmonger.Session();
    var payload = {};
    var authTokens = {};

    $(window).ready(onRender);

    // Se llama cuando la actividad se carga en el Journey
    function onRender() {
        console.log("Custom Activity UI rendered.");
        connection.trigger('ready');
        connection.trigger('requestTokens');
        connection.trigger('requestInteraction');
    }

    // Evento que se dispara cuando se hace clic en "Done"
    connection.on('clickedNext', save);

    function save() {
        console.log("Save function called.");
        // En este caso, el payload está vacío porque la configuración
        // principal está en config.json. Si tuvieras un formulario
        // en index.html, aquí recogerías los valores.
        payload.metaData = payload.metaData || {};
        payload.metaData.isConfigured = true;

        console.log('Final payload to save:', JSON.stringify(payload));
        connection.trigger('updateActivity', payload);
    }
});
