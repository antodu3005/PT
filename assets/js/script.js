document.addEventListener("DOMContentLoaded", () => {
    // --- Referencias del DOM ---
    const formEstandar = document.getElementById("formEstandar");
    const resultadoEstandar = document.getElementById("resultadoEstandar");
    const formSustitucion = document.getElementById("formSustitucion");
    const resultadoSustitucion = document.getElementById("resultadoSustitucion");
    
    const tablaNodosBody = document.getElementById("tablaNodosBody");
    const seccionTabla = document.getElementById("seccionTablaNodos");
    const btnDeshacer = document.getElementById("btnDeshacer");
    const btnLimpiarStorage = document.getElementById("btnLimpiarStorage");
    
    const seccionConfiguracion = document.getElementById("seccionConfiguracion");
    const tituloConfiguracion = document.getElementById("tituloConfiguracion");
    const inputInterfaz = document.getElementById("inputInterfaz");
    const btnAgregarInterfaz = document.getElementById("btnAgregarInterfaz");
    const listaInterfaces = document.getElementById("listaInterfaces");
    const btnCerrarConfiguracion = document.getElementById("btnCerrarConfiguracion");

    const seccionMenuNodo = document.getElementById("seccionMenuNodo");
    const nombreNodoMenu = document.getElementById("nombreNodoMenu");
    const btnOpcionRouter = document.getElementById("btnOpcionRouter");
    const seccionRouter = document.getElementById("seccionRouter");
    const btnCerrarRouter = document.getElementById("btnCerrarRouter");
    
    // Panel DHCP
    const checkHabilitarDhcp = document.getElementById("checkHabilitarDhcp");
    const formularioDhcp = document.getElementById("formularioDhcp");
    const dhcpPoolName = document.getElementById("dhcpPoolName");
    const dhcpExcluidas = document.getElementById("dhcpExcluidas");
    const dhcpRed = document.getElementById("dhcpRed");
    const dhcpMascara = document.getElementById("dhcpMascara");
    const dhcpGateway = document.getElementById("dhcpGateway");
    const dhcpDns = document.getElementById("dhcpDns");
    const btnAgregarDhcp = document.getElementById("btnAgregarDhcp");
    const listaDhcpPools = document.getElementById("listaDhcpPools");

    // Panel RIPv2
    const checkHabilitarRip = document.getElementById("checkHabilitarRip");
    const formularioRip = document.getElementById("formularioRip");
    const ripNetworkInput = document.getElementById("ripNetworkInput");
    const btnAgregarRipNetwork = document.getElementById("btnAgregarRipNetwork");
    const listaRipNetworks = document.getElementById("listaRipNetworks");

    const panelAuditoria = document.getElementById("panelAuditoria");
    const btnGenerarConfigRouter = document.getElementById("btnGenerarConfigRouter");
    const terminalRouter = document.getElementById("terminalRouter");
    const btnCopiarRouter = document.getElementById("btnCopiarRouter");
    const btnListoRouter = document.getElementById("btnListoRouter");

    const seccionResumenNodos = document.getElementById("seccionResumenNodos");
    const acordeonResumenNodos = document.getElementById("acordeonResumenNodos");

    // Estado General
    const listaNodos = [];
    const historialBorrados = []; 
    let nodoSeleccionadoIndex = null;
    let intfEditIndex = null; 

    // --- Persistencia (LocalStorage) ---
    function guardarDatosStorage() {
        localStorage.setItem('ipcalc_nodos', JSON.stringify(listaNodos));
        localStorage.setItem('ipcalc_history', JSON.stringify(historialBorrados));
    }

    function cargarDatosStorage() {
        const nodosGuardados = localStorage.getItem('ipcalc_nodos');
        const historialGuardado = localStorage.getItem('ipcalc_history');
        if (nodosGuardados) listaNodos.push(...JSON.parse(nodosGuardados));
        if (historialGuardado) historialBorrados.push(...JSON.parse(historialGuardado));
        if (listaNodos.length > 0 || historialBorrados.length > 0) renderizarTabla();
    }

    cargarDatosStorage();

    btnLimpiarStorage.addEventListener("click", () => {
        if(confirm("⚠️ ¿Borrar todo el progreso? Esto eliminará todos los nodos y no se puede deshacer.")) {
            localStorage.removeItem('ipcalc_nodos');
            localStorage.removeItem('ipcalc_history');
            location.reload(); 
        }
    });

    // --- Manejadores Formularios Calculadora ---
    formEstandar.addEventListener("submit", function(event) {
        event.preventDefault();
        procesarCalculoIP(document.getElementById("ipInput1").value.trim(), document.getElementById("bitsInput1").value.trim(), resultadoEstandar);
    });

    formSustitucion.addEventListener("submit", function(event) {
        event.preventDefault();
        const ipIncompleta = document.getElementById("ipInput2").value.trim();
        const valorX = document.getElementById("valorXInput").value.trim();
        const bitsValue = document.getElementById("bitsInput2").value.trim();

        if (ipIncompleta === "" || valorX === "" || bitsValue === "") {
            mostrarMensaje(resultadoSustitucion, "Por favor, llena todos los campos.", "warning"); return;
        }

        const ipFinal = ipIncompleta.replace(/[xX]+/g, valorX);
        procesarCalculoIP(ipFinal, bitsValue, resultadoSustitucion, `<div class="mb-2 text-warning"><small><em>IP Interpretada (XX=${valorX}): ${ipFinal}</em></small></div>`);
    });

    // --- Motor de Cálculo ---
    function procesarCalculoIP(ipValue, bitsValue, contenedor, htmlAdicional = "") {
        if (ipValue === "" || bitsValue === "") {
            mostrarMensaje(contenedor, "Por favor, ingresa la dirección IP y los bits.", "warning"); return;
        }

        const cidr = parseInt(bitsValue, 10);
        if (!esIPv4Valida(ipValue) || isNaN(cidr) || cidr < 0 || cidr > 32) {
            mostrarMensaje(contenedor, `${htmlAdicional}Formato de IP incorrecto o prefijo CIDR fuera de rango (0-32).`, "danger"); return;
        }

        const ipOctetos = ipValue.split('.').map(Number);
        const maskOctetos = calcularMascara(cidr);
        const wildcardOctetos = maskOctetos.map(m => 255 - m);
        const redOctetos = calcularRed(ipOctetos, maskOctetos);
        const broadcastOctetos = calcularBroadcast(redOctetos, wildcardOctetos);

        let esRedValida = true;
        for (let i = 0; i < 4; i++) {
            if (ipOctetos[i] !== redOctetos[i]) { esRedValida = false; break; }
        }

        if (esRedValida) {
            const redInt = ipToInt(redOctetos);
            const broadcastInt = ipToInt(broadcastOctetos);
            let hostMinOctetos = [], hostMaxOctetos = [], numHosts = 0;

            if (cidr === 32) { numHosts = 1; hostMinOctetos = [...redOctetos]; hostMaxOctetos = [...redOctetos]; } 
            else if (cidr === 31) { numHosts = 2; hostMinOctetos = [...redOctetos]; hostMaxOctetos = [...broadcastOctetos]; } 
            else {
                numHosts = Math.pow(2, 32 - cidr) - 2;
                hostMinOctetos = intToIp(redInt + 1);
                hostMaxOctetos = intToIp(broadcastInt - 1);
            }

            const datosRedCalculada = {
                direccion: `${ipValue}/${cidr}`,
                mascara: maskOctetos.join('.'),
                hostMin: hostMinOctetos.join('.'),
                hostMax: hostMaxOctetos.join('.'),
                broadcast: broadcastOctetos.join('.'),
                hosts: numHosts.toLocaleString(),
                interfaces: [],
                dhcpPools: [], 
                ripNetworks: [], // <- Arreglo para RIPv2
                scriptGenerado: null,
                auditoriaLogs: []
            };

            const textoParaCopiar = `Dirección: ${ipValue}\nMáscara: ${datosRedCalculada.mascara}\nPrimer host: ${datosRedCalculada.hostMin}\nÚltimo host/Gateway: ${datosRedCalculada.hostMax}\nBroadcast: ${datosRedCalculada.broadcast}\nHosts soportados: ${datosRedCalculada.hosts}`;

            contenedor.innerHTML = `
                <div class="alert alert-success p-0 overflow-hidden shadow-sm mb-0" role="alert">
                    <div class="bg-success text-white px-3 py-2 fw-bold d-flex justify-content-between align-items-center">
                        <span>¡Dirección Válida!</span>
                        <button class="btn btn-sm btn-light py-0 px-2 btn-copiar" style="font-size: 0.8rem;" title="Copiar">Copiar</button>
                    </div>
                    <div class="p-3 bg-dark text-info font-monospace" style="font-size: 1rem; line-height: 1.8;">
                        ${htmlAdicional}
                        <span class="text-secondary">Dirección:</span> <span class="text-light">${ipValue}</span><br>
                        <span class="text-secondary">Máscara:</span> <span class="text-light">${datosRedCalculada.mascara}</span><br>
                        <span class="text-secondary">Primer host:</span> <span class="text-light">${datosRedCalculada.hostMin}</span><br>
                        <span class="text-secondary">Último host/Gateway:</span> <span class="text-light">${datosRedCalculada.hostMax}</span><br>
                        <span class="text-secondary">Broadcast:</span> <span class="text-light">${datosRedCalculada.broadcast}</span><br>
                        <span class="text-secondary">Hosts soportados:</span> <span class="text-light">${datosRedCalculada.hosts}</span>
                        <hr class="border-secondary mt-3 mb-2">
                        <div class="mt-2">
                            <label class="form-label text-light fw-bold mb-1" style="font-size: 0.85rem;">Asignar red a cliente / nodo:</label>
                            <div class="input-group input-group-sm">
                                <input type="text" class="form-control input-cliente" placeholder="Ej. Pachuca 1">
                                <button class="btn btn-warning btn-guardar-nodo fw-bold" type="button">Guardar a Lista</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            contenedor.querySelector('.btn-copiar').addEventListener('click', (e) => {
                navigator.clipboard.writeText(textoParaCopiar).then(() => {
                    const txt = e.target.textContent;
                    e.target.textContent = "¡Copiado!";
                    e.target.classList.replace('btn-light', 'btn-success');
                    setTimeout(() => { e.target.textContent = txt; e.target.classList.replace('btn-success', 'btn-light'); }, 2000);
                });
            });

            const btnGuardar = contenedor.querySelector('.btn-guardar-nodo');
            const inputCliente = contenedor.querySelector('.input-cliente');
            btnGuardar.addEventListener('click', () => {
                const clienteNombre = inputCliente.value.trim();
                if (clienteNombre === "") { alert("Por favor, ingresa un nombre."); return; }
                guardarNodoLista(clienteNombre, datosRedCalculada);
                inputCliente.value = ""; 
            });

        } else {
            mostrarMensaje(contenedor, `${htmlAdicional}<h5 class="alert-heading mt-2">Dirección Inválida</h5><p>La dirección <strong>${ipValue}/${cidr}</strong> contiene bits de host activos.</p><hr><p class="mb-0">Dirección de red base correcta: <strong>${redOctetos.join('.')}</strong></p>`, "danger");
        }
    }

    // --- Módulo Matemático de Auditoría IP ---
    function auditarNodo(nodo) {
        let logs = [];
        
        if (nodo.interfaces.length === 0) {
            logs.push({ tipo: 'warning', texto: `El nodo no tiene interfaces configuradas.` });
        }

        nodo.interfaces.forEach(intf => {
            if (!intf.ip || !intf.mascara) {
                logs.push({ tipo: 'danger', texto: `Puerto ${intf.nombre.toUpperCase()}: Falta configurar IP y máscara.` });
            } else {
                const ipInt = ipToInt(intf.ip.split('.').map(Number));
                const maskInt = ipToInt(intf.mascara.split('.').map(Number));
                const redInt = ipInt & maskInt;
                const wildInt = ~maskInt >>> 0;
                const broadcastInt = redInt | wildInt;

                if (ipInt === redInt) {
                    logs.push({ tipo: 'danger', texto: `Puerto ${intf.nombre.toUpperCase()}: La IP ${intf.ip} es dirección de RED (.0).` });
                } else if (ipInt === broadcastInt) {
                    logs.push({ tipo: 'danger', texto: `Puerto ${intf.nombre.toUpperCase()}: La IP ${intf.ip} es dirección de BROADCAST.` });
                } else {
                    logs.push({ tipo: 'success', texto: `Puerto ${intf.nombre.toUpperCase()}: IP ${intf.ip} válida de host.` });
                }

                if (intf.helper && !esIPv4Valida(intf.helper)) {
                    logs.push({ tipo: 'danger', texto: `Puerto ${intf.nombre.toUpperCase()}: Helper-address malformado (${intf.helper}).` });
                }
            }
        });

        if (checkHabilitarDhcp.checked) {
            if (nodo.dhcpPools.length === 0) {
                logs.push({ tipo: 'warning', texto: `DHCP habilitado pero sin pools configurados.` });
            } else {
                nodo.dhcpPools.forEach(pool => {
                    const netInt = ipToInt(pool.red.split('.').map(Number));
                    const maskInt = ipToInt(pool.mascara.split('.').map(Number));
                    const calcRed = netInt & maskInt;
                    if (netInt !== calcRed) {
                        logs.push({ tipo: 'danger', texto: `DHCP [${pool.nombre}]: Red ${pool.red} no coincide con máscara ${pool.mascara}.` });
                    } else {
                        logs.push({ tipo: 'success', texto: `DHCP [${pool.nombre}]: Red y máscara congruentes.` });
                    }
                });
            }
        }
        return logs;
    }

    // --- Tabla Maestra de Nodos ---
    function guardarNodoLista(cliente, datosRed) {
        listaNodos.push({ cliente, ...datosRed });
        historialBorrados.length = 0; 
        renderizarTabla();
    }

    function renderizarTabla() {
        btnDeshacer.style.display = historialBorrados.length > 0 ? "inline-block" : "none";

        if (listaNodos.length > 0 || historialBorrados.length > 0) {
            seccionTabla.style.display = "flex";
        } else {
            seccionTabla.style.display = "none";
            nodoSeleccionadoIndex = null;
        }
        
        if (listaNodos.length === 0 && historialBorrados.length > 0) {
            tablaNodosBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-3">Todos los nodos eliminados. Puedes deshacer la acción.</td></tr>`;
        } else {
            tablaNodosBody.innerHTML = listaNodos.map((nodo, index) => {
                const isSelected = index === nodoSeleccionadoIndex;
                const totalIntf = nodo.interfaces.length;
                return `
                    <tr class="fila-nodo ${isSelected ? 'table-primary border-primary' : ''}" data-index="${index}">
                        <td class="fw-bold ${isSelected ? 'text-dark' : 'text-primary'}">${nodo.cliente}</td>
                        <td><span class="badge ${isSelected ? 'bg-primary' : 'bg-secondary'}">${nodo.direccion}</span></td>
                        <td>${nodo.mascara}</td>
                        <td>${nodo.hostMin}</td>
                        <td>${nodo.hostMax}</td>
                        <td>${nodo.broadcast}</td>
                        <td>${nodo.hosts}</td>
                        <td><span class="badge bg-${totalIntf > 0 ? 'success' : 'light text-dark'} border">${totalIntf}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger btn-eliminar" data-index="${index}">Eliminar</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        renderizarConfiguracion();
        renderizarMenuNodo();
        renderizarDhcpPools();
        renderizarRipNetworks();
        renderizarResumenNodos(); 
        
        guardarDatosStorage();
    }

    // --- Panel de Configuración de Interfaces ---
    function renderizarConfiguracion() {
        if (nodoSeleccionadoIndex === null || !listaNodos[nodoSeleccionadoIndex]) {
            seccionConfiguracion.style.display = "none";
            intfEditIndex = null;
            return;
        }

        const nodo = listaNodos[nodoSeleccionadoIndex];
        seccionConfiguracion.style.display = "flex";
        tituloConfiguracion.innerHTML = `Gestión de Interfaces: <span class="text-dark border-bottom border-2 border-primary">${nodo.cliente}</span>`;

        if (nodo.interfaces.length === 0) {
            listaInterfaces.innerHTML = `<li class="list-group-item text-center text-muted fst-italic py-3">No hay interfaces conectadas. Agrega una desde el panel izquierdo.</li>`;
        } else {
            listaInterfaces.innerHTML = nodo.interfaces.map((intf, index) => {
                if (index === intfEditIndex) {
                    return `
                    <li class="list-group-item py-3 px-3 mb-2 border-primary border-2 rounded shadow-sm bg-light">
                        <div class="fw-bold text-primary mb-3">
                            <span class="badge bg-primary me-2">Editando</span>${intf.nombre.toUpperCase()}
                        </div>
                        <div class="row g-2">
                            <div class="col-md-6 mb-2">
                                <label class="form-label fw-bold text-secondary mb-1" style="font-size: 0.8rem;">Dirección IP o Red:</label>
                                <input type="text" id="inlineIp_${index}" class="form-control form-control-sm border-primary" placeholder="Ej. 192.168.10.1" value="${intf.ip || ''}">
                            </div>
                            <div class="col-md-6 mb-2">
                                <label class="form-label fw-bold text-secondary mb-1" style="font-size: 0.8rem;">Máscara de Subred:</label>
                                <input type="text" id="inlineMask_${index}" class="form-control form-control-sm border-primary" placeholder="Ej. 255.255.255.0" value="${intf.mascara || ''}">
                            </div>
                            <div class="col-md-12 mb-2">
                                <label class="form-label fw-bold text-secondary mb-1" style="font-size: 0.8rem;">IP Helper-Address (Opcional):</label>
                                <input type="text" id="inlineHelper_${index}" class="form-control form-control-sm border-info" placeholder="Ej. 192.168.20.5" value="${intf.helper || ''}">
                            </div>
                        </div>
                        
                        <div class="d-flex flex-column flex-md-row align-items-md-center gap-3 mt-2 border-top pt-3">
                            <div class="form-check form-switch">
                                <input class="form-check-input check-clock-rate" type="checkbox" id="inlineCheckClock_${index}" data-index="${index}" ${intf.clockRate ? 'checked' : ''}>
                                <label class="form-check-label fw-bold text-muted" style="font-size: 0.85rem;" for="inlineCheckClock_${index}">Clock Rate (DCE)</label>
                            </div>
                            <div id="containerClockValue_${index}" style="display: ${intf.clockRate ? 'block' : 'none'};">
                                <input type="number" id="inlineClockValue_${index}" class="form-control form-control-sm border-warning" placeholder="Valor (Ej. 64000)" value="${intf.clockRateValue || ''}">
                            </div>
                        </div>

                        <div class="d-flex justify-content-end gap-2 mt-3">
                            <button class="btn btn-sm btn-secondary btn-cancelar-inline">Cancelar</button>
                            <button class="btn btn-sm btn-success fw-bold btn-guardar-inline" data-index="${index}">💾 Guardar Cambios</button>
                        </div>
                    </li>
                    `;
                }

                const clockBadge = intf.clockRate ? `<span class="badge bg-warning text-dark ms-2 border border-secondary" style="font-size: 0.65rem;">⏱ CLOCK: ${intf.clockRateValue}</span>` : '';
                const helperBadge = intf.helper ? `<span class="badge bg-info text-dark ms-2 border border-secondary" style="font-size: 0.65rem;">HELPER: ${intf.helper}</span>` : '';
                
                const estadoConfig = (intf.ip && intf.mascara) 
                    ? `<div class="text-muted font-monospace mt-1" style="font-size: 0.85rem;">IP: <span class="text-dark fw-bold">${intf.ip}</span> | Mask: <span class="text-dark fw-bold">${intf.mascara}</span></div>` 
                    : `<div class="text-danger fst-italic mt-1" style="font-size: 0.80rem;">⚠️ Falta configurar red y máscara</div>`;

                return `
                <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-3 mb-2 border rounded shadow-sm">
                    <div>
                        <div>
                            <span class="badge bg-secondary me-1">INT</span>
                            <strong class="font-monospace text-primary fs-6">${intf.nombre.toUpperCase()}</strong>
                            ${clockBadge}
                            ${helperBadge}
                        </div>
                        ${estadoConfig}
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary fw-bold btn-configurar-intf" data-intf-index="${index}">Configurar</button>
                        <button class="btn btn-outline-danger fw-bold btn-quitar-intf" data-intf-index="${index}" title="Eliminar Interfaz">X</button>
                    </div>
                </li>
            `}).join('');
        }
    }

    btnAgregarInterfaz.addEventListener("click", () => {
        if (nodoSeleccionadoIndex === null) return;
        const valorIntf = inputInterfaz.value.trim().toLowerCase();
        if (valorIntf === "") return;

        const regexInterfaz = /^[fgs]\d+\/\d+(\/\d+)?$/;
        if (!regexInterfaz.test(valorIntf)) {
            alert("Formato inválido. Usa f, g o s. Ej: f0/0, g0/1/0, s0/0"); return;
        }

        const nodo = listaNodos[nodoSeleccionadoIndex];
        if (nodo.interfaces.some(intf => intf.nombre === valorIntf)) {
            alert(`La interfaz ${valorIntf.toUpperCase()} ya existe.`); return;
        }

        nodo.interfaces.push({ nombre: valorIntf, ip: null, mascara: null, clockRate: false, clockRateValue: null, helper: null });
        inputInterfaz.value = "";
        renderizarTabla(); 
    });

    inputInterfaz.addEventListener("keypress", function(event) {
        if (event.key === "Enter") { event.preventDefault(); btnAgregarInterfaz.click(); }
    });

    listaInterfaces.addEventListener("click", function(event) {
        if (event.target.classList.contains("btn-quitar-intf")) {
            const index = parseInt(event.target.getAttribute("data-intf-index"), 10);
            listaNodos[nodoSeleccionadoIndex].interfaces.splice(index, 1);
            intfEditIndex = null; 
            renderizarTabla();
        }

        if (event.target.classList.contains("btn-configurar-intf")) {
            intfEditIndex = parseInt(event.target.getAttribute("data-intf-index"), 10);
            renderizarTabla(); 
        }

        if (event.target.classList.contains("btn-cancelar-inline")) {
            intfEditIndex = null;
            renderizarTabla();
        }

        if (event.target.classList.contains("btn-guardar-inline")) {
            const index = parseInt(event.target.getAttribute("data-index"), 10);
            const inputIp = document.getElementById(`inlineIp_${index}`).value.trim();
            const inputMask = document.getElementById(`inlineMask_${index}`).value.trim();
            const inputHelper = document.getElementById(`inlineHelper_${index}`).value.trim();
            const checkClock = document.getElementById(`inlineCheckClock_${index}`).checked;
            const inputClockVal = document.getElementById(`inlineClockValue_${index}`).value.trim();

            if (inputIp === "" || inputMask === "") { alert("Por favor, ingresa la IP y la Máscara."); return; }
            if (!esIPv4Valida(inputIp)) { alert("La Dirección IP ingresada no es válida."); return; }
            if (!esIPv4Valida(inputMask)) { alert("La Máscara ingresada no es válida."); return; }
            if (inputHelper !== "" && !esIPv4Valida(inputHelper)) { alert("La dirección Helper IP no es válida."); return; }
            if (checkClock && inputClockVal === "") { alert("Ingresa el valor del Clock Rate (Ej. 64000)."); return; }

            const intfActual = listaNodos[nodoSeleccionadoIndex].interfaces[index];
            intfActual.ip = inputIp;
            intfActual.mascara = inputMask;
            intfActual.helper = inputHelper !== "" ? inputHelper : null;
            intfActual.clockRate = checkClock;
            intfActual.clockRateValue = checkClock ? inputClockVal : null;

            intfEditIndex = null; 
            renderizarTabla();
        }
    });

    listaInterfaces.addEventListener("change", function(event) {
        if (event.target.classList.contains("check-clock-rate")) {
            const index = event.target.getAttribute("data-index");
            const inputContainer = document.getElementById(`containerClockValue_${index}`);
            if (event.target.checked) {
                inputContainer.style.display = "block";
            } else {
                inputContainer.style.display = "none";
                document.getElementById(`inlineClockValue_${index}`).value = ""; 
            }
        }
    });

    btnCerrarConfiguracion.addEventListener("click", () => {
        nodoSeleccionadoIndex = null;
        intfEditIndex = null;
        renderizarTabla(); 
    });

    // --- Panel Menú Nodo y Generador CLI Router ---
    function renderizarMenuNodo() {
        if (nodoSeleccionadoIndex === null || !listaNodos[nodoSeleccionadoIndex]) {
            seccionMenuNodo.style.display = "none";
            seccionRouter.style.display = "none";
            panelAuditoria.style.display = "none";
            return;
        }
        const nodo = listaNodos[nodoSeleccionadoIndex];
        seccionMenuNodo.style.display = "flex";
        nombreNodoMenu.textContent = nodo.cliente;
    }

    btnOpcionRouter.addEventListener("click", () => {
        seccionRouter.style.display = "flex";
        seccionRouter.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    btnCerrarRouter.addEventListener("click", () => {
        seccionRouter.style.display = "none";
    });

    // Toggles DHCP y RIP
    checkHabilitarDhcp.addEventListener("change", function() {
        formularioDhcp.style.display = this.checked ? "block" : "none";
    });
    checkHabilitarRip.addEventListener("change", function() {
        formularioRip.style.display = this.checked ? "block" : "none";
    });

    // --- Panel DHCP Multiple ---
    function renderizarDhcpPools() {
        if (nodoSeleccionadoIndex === null || !listaNodos[nodoSeleccionadoIndex]) return;
        const nodo = listaNodos[nodoSeleccionadoIndex];

        if (nodo.dhcpPools.length === 0) {
            listaDhcpPools.innerHTML = `<li class="list-group-item text-center text-muted small py-2">No hay pools configurados.</li>`;
        } else {
            listaDhcpPools.innerHTML = nodo.dhcpPools.map((pool, index) => `
                <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-3 mb-2 border border-success rounded shadow-sm">
                    <div>
                        <div class="fw-bold text-success" style="font-size: 0.9rem;">${pool.nombre}</div>
                        <div class="text-muted font-monospace" style="font-size: 0.75rem;">
                            Red: ${pool.red} | Mask: ${pool.mascara}
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2 fw-bold btn-quitar-dhcp" data-dhcp-index="${index}" title="Eliminar Pool">X</button>
                </li>
            `).join('');
        }
    }

    btnAgregarDhcp.addEventListener("click", () => {
        if (nodoSeleccionadoIndex === null) return;
        
        const pool = dhcpPoolName.value.trim();
        const exc = dhcpExcluidas.value.trim();
        const net = dhcpRed.value.trim();
        const mask = dhcpMascara.value.trim();
        const gw = dhcpGateway.value.trim();
        const dns = dhcpDns.value.trim();

        if (pool === "" || net === "" || mask === "") { alert("El Nombre, la IP de Red y la Máscara son obligatorios."); return; }
        if (!esIPv4Valida(net) || !esIPv4Valida(mask)) { alert("La IP de Red o Máscara tienen un formato inválido."); return; }

        const nodo = listaNodos[nodoSeleccionadoIndex];
        if (nodo.dhcpPools.some(p => p.nombre.toLowerCase() === pool.toLowerCase())) { alert("Ya existe un Pool DHCP con ese nombre."); return; }

        nodo.dhcpPools.push({
            nombre: pool, excluidas: exc !== "" ? exc : null, red: net, mascara: mask, gateway: gw !== "" ? gw : null, dns: dns !== "" ? dns : null
        });

        dhcpPoolName.value = ""; dhcpExcluidas.value = ""; dhcpRed.value = ""; dhcpMascara.value = ""; dhcpGateway.value = ""; dhcpDns.value = "";
        renderizarTabla(); 
    });

    listaDhcpPools.addEventListener("click", function(event) {
        if (event.target.classList.contains("btn-quitar-dhcp")) {
            const index = parseInt(event.target.getAttribute("data-dhcp-index"), 10);
            listaNodos[nodoSeleccionadoIndex].dhcpPools.splice(index, 1);
            renderizarTabla();
        }
    });

    // --- Panel RIPv2 ---
    function renderizarRipNetworks() {
        if (nodoSeleccionadoIndex === null || !listaNodos[nodoSeleccionadoIndex]) return;
        const nodo = listaNodos[nodoSeleccionadoIndex];

        if (nodo.ripNetworks.length === 0) {
            listaRipNetworks.innerHTML = `<li class="list-group-item text-center text-muted small py-2">No hay redes agregadas.</li>`;
        } else {
            listaRipNetworks.innerHTML = nodo.ripNetworks.map((net, index) => `
                <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-2 mb-1 border rounded shadow-sm" style="font-size: 0.85rem;">
                    <span class="font-monospace text-dark fw-bold">${net}</span>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2 fw-bold btn-quitar-rip" data-rip-index="${index}" title="Eliminar Red">X</button>
                </li>
            `).join('');
        }
    }

    btnAgregarRipNetwork.addEventListener("click", () => {
        if (nodoSeleccionadoIndex === null) return;
        const net = ripNetworkInput.value.trim();
        if (!esIPv4Valida(net)) { alert("Dirección de red inválida."); return; }
        
        const nodo = listaNodos[nodoSeleccionadoIndex];
        if (nodo.ripNetworks.includes(net)) { alert("Esta red ya está en la lista."); return; }
        
        nodo.ripNetworks.push(net);
        ripNetworkInput.value = "";
        renderizarTabla();
    });

    listaRipNetworks.addEventListener("click", function(event) {
        if (event.target.classList.contains("btn-quitar-rip")) {
            const index = parseInt(event.target.getAttribute("data-rip-index"), 10);
            listaNodos[nodoSeleccionadoIndex].ripNetworks.splice(index, 1);
            renderizarTabla();
        }
    });


    // --- Generación Script CLI y Auditoría ---
    btnGenerarConfigRouter.addEventListener("click", () => {
        const nodo = listaNodos[nodoSeleccionadoIndex];
        if (!nodo) return;

        const logsAuditoria = auditarNodo(nodo);
        nodo.auditoriaLogs = logsAuditoria;

        const hasErrors = logsAuditoria.some(l => l.tipo === 'danger');
        panelAuditoria.style.display = "block";
        panelAuditoria.innerHTML = `
            <div class="alert ${hasErrors ? 'alert-danger border-danger' : 'alert-success border-success'} shadow-sm">
                <h6 class="fw-bold mb-2">🔍 Reporte de Auditoría Matemática de IPs:</h6>
                <ul class="mb-0 small font-monospace">
                    ${logsAuditoria.map(log => {
                        const icon = log.tipo === 'danger' ? '❌' : (log.tipo === 'warning' ? '⚠️' : '✅');
                        return `<li>${icon}${log.texto}</li>`;
                    }).join('')}
                </ul>
            </div>
        `;

        let cli = "enable\nconfigure terminal\n";

        // 1. DHCP
        if (checkHabilitarDhcp.checked && nodo.dhcpPools.length > 0) {
            nodo.dhcpPools.forEach(pool => {
                if (pool.excluidas) cli += `ip dhcp excluded-address ${pool.excluidas}\n`;
                cli += `ip dhcp pool ${pool.nombre}\n`;
                cli += `network ${pool.red} ${pool.mascara}\n`;
                if (pool.gateway) cli += `default-router ${pool.gateway}\n`;
                if (pool.dns) cli += `dns-server ${pool.dns}\n`;
                cli += `exit\n`;
            });
        }

        // 2. RIPv2
        if (checkHabilitarRip.checked && nodo.ripNetworks.length > 0) {
            cli += `router rip\nversion 2\nno auto-summary\n`;
            nodo.ripNetworks.forEach(net => {
                cli += `network ${net}\n`;
            });
            cli += `exit\n`;
        }

        // 3. Interfaces
        if (nodo.interfaces.length > 0) {
            nodo.interfaces.forEach(intf => {
                let nombreCompleto = intf.nombre;
                if(intf.nombre.startsWith('f')) nombreCompleto = intf.nombre.replace('f', 'fastEthernet ');
                if(intf.nombre.startsWith('g')) nombreCompleto = intf.nombre.replace('g', 'gigabitEthernet ');
                if(intf.nombre.startsWith('s')) nombreCompleto = intf.nombre.replace('s', 'serial ');

                cli += `interface ${nombreCompleto}\n`;
                if (intf.ip && intf.mascara) cli += `ip address ${intf.ip} ${intf.mascara}\n`;
                if (intf.helper) cli += `ip helper-address ${intf.helper}\n`;
                if (intf.clockRate && intf.clockRateValue) cli += `clock rate ${intf.clockRateValue}\n`;
                cli += `no shutdown\nexit\n`;
            });
        }

        cli += "exit\nwrite memory\n";
        
        terminalRouter.textContent = cli;
        btnListoRouter.style.display = "inline-block"; 
        guardarDatosStorage(); 
    });

    btnCopiarRouter.addEventListener("click", () => {
        navigator.clipboard.writeText(terminalRouter.textContent).then(() => {
            const txt = btnCopiarRouter.textContent;
            btnCopiarRouter.textContent = "¡Copiado!";
            btnCopiarRouter.classList.replace("btn-outline-secondary", "btn-success");
            setTimeout(() => { 
                btnCopiarRouter.textContent = txt; 
                btnCopiarRouter.classList.replace("btn-success", "btn-outline-secondary");
            }, 2000);
        });
    });

    btnListoRouter.addEventListener("click", () => {
        if (nodoSeleccionadoIndex !== null) {
            const nodo = listaNodos[nodoSeleccionadoIndex];
            nodo.scriptGenerado = terminalRouter.textContent; 
            renderizarTabla(); 
            seccionResumenNodos.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    // --- Resumen de Nodos Configurados (Acordeón y Desglose) ---
    function renderizarResumenNodos() {
        const nodosConfigurados = listaNodos.filter(n => n.scriptGenerado);
        
        if (nodosConfigurados.length > 0) {
            seccionResumenNodos.style.display = "flex";
        } else {
            seccionResumenNodos.style.display = "none";
            return;
        }

        acordeonResumenNodos.innerHTML = nodosConfigurados.map((nodo, i) => {
            const indexReal = listaNodos.indexOf(nodo);
            const hasErrors = nodo.auditoriaLogs && nodo.auditoriaLogs.some(l => l.tipo === 'danger');
            const semaforoBadge = hasErrors ? `<span class="badge bg-danger ms-2">🔴 Error IP</span>` : `<span class="badge bg-success ms-2">🟢 OK IP</span>`;

            let desgloseIntf = `<li class="list-group-item text-muted small py-1">Sin interfaces configuradas</li>`;
            if (nodo.interfaces.length > 0) {
                desgloseIntf = nodo.interfaces.map(intf => {
                    return `<li class="list-group-item py-1 px-2 d-flex justify-content-between align-items-center" style="font-size: 0.85rem;">
                        <span class="fw-bold">${intf.nombre.toUpperCase()}</span>
                        <span class="font-monospace text-muted">${intf.ip ? intf.ip : 'Sin IP'}</span>
                    </li>`;
                }).join('');
            }

            let desgloseDhcp = `<li class="list-group-item text-muted small py-1">Sin servidores DHCP</li>`;
            if (nodo.dhcpPools.length > 0) {
                desgloseDhcp = nodo.dhcpPools.map(pool => {
                    return `<li class="list-group-item py-1 px-2 d-flex justify-content-between align-items-center" style="font-size: 0.85rem;">
                        <span class="fw-bold text-success">${pool.nombre}</span>
                        <span class="font-monospace text-muted">${pool.red}</span>
                    </li>`;
                }).join('');
            }
            
            let desgloseRip = `<li class="list-group-item text-muted small py-1">RIPv2 no configurado</li>`;
            if (nodo.ripNetworks && nodo.ripNetworks.length > 0) {
                desgloseRip = nodo.ripNetworks.map(net => {
                    return `<li class="list-group-item py-1 px-2 font-monospace text-dark" style="font-size: 0.85rem;">${net}</li>`;
                }).join('');
            }

            let auditList = `<li class="list-group-item text-muted small py-1">Sin auditoría ejecutada</li>`;
            if (nodo.auditoriaLogs && nodo.auditoriaLogs.length > 0) {
                auditList = nodo.auditoriaLogs.map(l => {
                    const icon = l.tipo === 'danger' ? '❌' : (l.tipo === 'warning' ? '⚠️' : '✅');
                    return `<li class="list-group-item py-1 px-2 small font-monospace">${icon} ${l.texto}</li>`;
                }).join('');
            }

            return `
            <div class="accordion-item mb-2 border rounded shadow-sm">
                <h2 class="accordion-header" id="heading_${indexReal}">
                    <button class="accordion-button collapsed fw-bold text-dark bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${indexReal}">
                        ✅ ${nodo.cliente} <span class="badge bg-secondary ms-2">${nodo.direccion}</span> ${semaforoBadge}
                        <span class="ms-auto me-3 d-none d-md-block">
                            <span class="badge bg-primary text-light me-1">${nodo.interfaces.length} INTs</span>
                            <span class="badge bg-success text-light me-1">${nodo.dhcpPools.length} DHCPs</span>
                            <span class="badge bg-dark text-light">${nodo.ripNetworks ? nodo.ripNetworks.length : 0} RIPs</span>
                        </span>
                    </button>
                </h2>
                <div id="collapse_${indexReal}" class="accordion-collapse collapse" data-bs-parent="#acordeonResumenNodos">
                    <div class="accordion-body bg-white border-top">
                        <div class="row mb-4">
                            <div class="col-md-3 mb-3 mb-md-0">
                                <h6 class="fw-bold text-primary border-bottom pb-1">Interfaces</h6>
                                <ul class="list-group list-group-flush">${desgloseIntf}</ul>
                            </div>
                            <div class="col-md-3 mb-3 mb-md-0">
                                <h6 class="fw-bold text-success border-bottom pb-1">Pools DHCP</h6>
                                <ul class="list-group list-group-flush">${desgloseDhcp}</ul>
                            </div>
                            <div class="col-md-3 mb-3 mb-md-0">
                                <h6 class="fw-bold text-dark border-bottom pb-1">Redes RIPv2</h6>
                                <ul class="list-group list-group-flush">${desgloseRip}</ul>
                            </div>
                            <div class="col-md-3">
                                <h6 class="fw-bold text-danger border-bottom pb-1">Diagnóstico IP</h6>
                                <ul class="list-group list-group-flush">${auditList}</ul>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="text-muted fw-bold small">Script CLI (Sin saltos de línea ni comentarios):</span>
                            <button class="btn btn-sm btn-outline-primary btn-copiar-resumen fw-bold" data-script="${encodeURIComponent(nodo.scriptGenerado)}">📋 Copiar Script</button>
                        </div>
                        <pre class="bg-dark text-success p-3 rounded font-monospace m-0" style="font-size: 0.85rem; white-space: pre-wrap;">${nodo.scriptGenerado}</pre>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    acordeonResumenNodos.addEventListener("click", function(event) {
        if (event.target.classList.contains("btn-copiar-resumen")) {
            const script = decodeURIComponent(event.target.getAttribute("data-script"));
            navigator.clipboard.writeText(script).then(() => {
                const txt = event.target.textContent;
                event.target.textContent = "¡Copiado!";
                event.target.classList.replace("btn-outline-primary", "btn-success");
                setTimeout(() => {
                    event.target.textContent = txt;
                    event.target.classList.replace("btn-success", "btn-outline-primary");
                }, 2000);
            });
        }
    });

    // --- Delegación Clicks en la Tabla Principal ---
    btnDeshacer.addEventListener("click", () => {
        if (historialBorrados.length > 0) {
            const restaurado = historialBorrados.pop();
            listaNodos.splice(restaurado.index, 0, restaurado.nodo);
            if (nodoSeleccionadoIndex !== null && nodoSeleccionadoIndex >= restaurado.index) nodoSeleccionadoIndex++;
            renderizarTabla();
        }
    });

    tablaNodosBody.addEventListener("click", function(event) {
        if (event.target.closest(".btn-eliminar")) {
            const btn = event.target.closest(".btn-eliminar");
            const index = parseInt(btn.getAttribute("data-index"), 10);
            
            historialBorrados.push({ index: index, nodo: listaNodos[index] });
            listaNodos.splice(index, 1);
            
            if (nodoSeleccionadoIndex === index) {
                nodoSeleccionadoIndex = null;
                intfEditIndex = null;
            } else if (nodoSeleccionadoIndex !== null && nodoSeleccionadoIndex > index) {
                nodoSeleccionadoIndex--;
            }
            renderizarTabla();
            return;
        }

        const fila = event.target.closest(".fila-nodo");
        if (fila) {
            const index = parseInt(fila.getAttribute("data-index"), 10);
            if (nodoSeleccionadoIndex === index) {
                nodoSeleccionadoIndex = null;
            } else {
                nodoSeleccionadoIndex = index;
            }
            intfEditIndex = null;
            seccionRouter.style.display = "none"; 
            panelAuditoria.style.display = "none";
            
            checkHabilitarDhcp.checked = false;
            formularioDhcp.style.display = "none";
            checkHabilitarRip.checked = false;
            formularioRip.style.display = "none";
            
            terminalRouter.textContent = "Haz clic en \"Generar Código y Auditar\" para evaluar IPs y crear script.";
            btnListoRouter.style.display = "none"; 
            
            renderizarTabla();
        }
    });

    // --- Funciones Matemáticas Auxiliares ---
    function esIPv4Valida(ip) { return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip); }
    function calcularMascara(cidr) { const m = []; for (let i=0; i<4; i++) { if (cidr >= 8) { m.push(255); cidr -= 8; } else if (cidr > 0) { m.push(256 - Math.pow(2, 8 - cidr)); cidr = 0; } else { m.push(0); } } return m; }
    function calcularRed(ipArray, maskArray) { return ipArray.map((octeto, i) => octeto & maskArray[i]); }
    function calcularBroadcast(redArray, wildcardArray) { return redArray.map((octeto, i) => octeto | wildcardArray[i]); }
    function ipToInt(ipArray) { return (ipArray[0] * 16777216) + (ipArray[1] * 65536) + (ipArray[2] * 256) + ipArray[3]; }
    function intToIp(int) { return [ Math.floor(int / 16777216) % 256, Math.floor(int / 65536) % 256, Math.floor(int / 256) % 256, int % 256 ]; }
    function mostrarMensaje(contenedor, html, tipo) { contenedor.innerHTML = `<div class="alert alert-${tipo}" role="alert">${html}</div>`; }
    
    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            tabs.forEach(t => { t.classList.remove('text-dark', 'fw-bold', 'bg-light'); t.classList.add('text-white'); });
            event.target.classList.remove('text-white');
            event.target.classList.add('text-dark', 'fw-bold', 'bg-light');
        });
    });
});