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

    // --- Estado General ---
    const listaNodos = [];
    const historialBorrados = [];
    let nodoSeleccionadoIndex = null;
    let intfEditIndex = null;

    const TEXTO_TERMINAL_VACIO = 'Haz clic en "Generar Código y Auditar" para evaluar IPs y crear script.';

    // --- Utilidades ---
    function esc(valor) {
        const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(valor ?? "").replace(/[&<>"']/g, c => mapa[c]);
    }

    function nodoActual() {
        return nodoSeleccionadoIndex !== null ? (listaNodos[nodoSeleccionadoIndex] || null) : null;
    }

    function invalidarScript(nodo) {
        if (!nodo) return;
        nodo.scriptGenerado = null;
        nodo.auditoriaLogs = [];
        terminalRouter.textContent = TEXTO_TERMINAL_VACIO;
        btnListoRouter.style.display = "none";
        panelAuditoria.style.display = "none";
    }

    function guardEdit() {
        if (intfEditIndex !== null) {
            alert("Por favor, guarda o cancela la edición de la interfaz antes de continuar.");
            return false;
        }
        return true;
    }

    function copiarAlPortapapeles(texto, btnElement, textoOriginal, claseBase = "", claseExito = "") {
        if (!texto || texto === TEXTO_TERMINAL_VACIO) return;

        const exito = () => {
            if (btnElement && claseBase && claseExito) {
                btnElement.textContent = "¡Copiado!";
                try {
                    btnElement.classList.replace(claseBase, claseExito);
                } catch(e) {
                    btnElement.classList.add(claseExito);
                }
                setTimeout(() => {
                    btnElement.textContent = textoOriginal;
                    try {
                        btnElement.classList.replace(claseExito, claseBase);
                    } catch(e) {
                        btnElement.classList.remove(claseExito);
                    }
                }, 2000);
            }
        };

        const fallback = () => {
            try {
                const ta = document.createElement("textarea");
                ta.value = texto;
                ta.style.position = "fixed"; ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                exito();
            } catch (err) {
                alert("Tu navegador bloqueó el copiado automático. Cópialo manualmente.");
            }
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(texto).then(exito).catch(fallback);
        } else {
            fallback();
        }
    }

    // --- Persistencia (LocalStorage) ---
    function leerJSON(key) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key));
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function normalizarNodo(n) {
        const base = (n && typeof n === "object") ? n : {};
        const interfaces = (Array.isArray(base.interfaces) ? base.interfaces : []).filter(i => i && typeof i.nombre === "string");
        const dhcpPools = (Array.isArray(base.dhcpPools) ? base.dhcpPools : []).filter(p => p && typeof p.nombre === "string" && typeof p.red === "string" && typeof p.mascara === "string");
        const ripNetworks = (Array.isArray(base.ripNetworks) ? base.ripNetworks : []).filter(r => typeof r === "string");

        return {
            cliente: "", direccion: "", mascara: "", hostMin: "", hostMax: "", broadcast: "", hosts: "", hostsCrudo: 0,
            scriptGenerado: null,
            ...base,
            interfaces, dhcpPools, ripNetworks,
            auditoriaLogs: Array.isArray(base.auditoriaLogs) ? base.auditoriaLogs : [],
            dhcpHabilitado: typeof base.dhcpHabilitado === "boolean" ? base.dhcpHabilitado : dhcpPools.length > 0,
            ripHabilitado: typeof base.ripHabilitado === "boolean" ? base.ripHabilitado : ripNetworks.length > 0
        };
    }

    function guardarDatosStorage() {
        try {
            localStorage.setItem('ipcalc_nodos', JSON.stringify(listaNodos));
            localStorage.setItem('ipcalc_history', JSON.stringify(historialBorrados));
        } catch (e) { console.warn("No se pudo guardar en localStorage:", e); }
    }

    function cargarDatosStorage() {
        leerJSON('ipcalc_nodos').forEach(n => listaNodos.push(normalizarNodo(n)));
        leerJSON('ipcalc_history').forEach(h => {
            if (h && Number.isInteger(h.index) && h.nodo) historialBorrados.push({ index: h.index, nodo: normalizarNodo(h.nodo) });
        });
        if (listaNodos.length > 0 || historialBorrados.length > 0) renderizarTabla();
    }

    btnLimpiarStorage.addEventListener("click", () => {
        if (confirm("⚠️ ¿Borrar todo el progreso? Esto eliminará todos los nodos y no se puede deshacer.")) {
            try { localStorage.removeItem('ipcalc_nodos'); localStorage.removeItem('ipcalc_history'); } catch (e) { }
            location.reload();
        }
    });

    // --- Calculadora IP ---
    formEstandar.addEventListener("submit", function (event) {
        event.preventDefault();
        procesarCalculoIP(document.getElementById("ipInput1").value.trim(), document.getElementById("bitsInput1").value.trim(), resultadoEstandar);
    });

    formSustitucion.addEventListener("submit", function (event) {
        event.preventDefault();
        const ipIncompleta = document.getElementById("ipInput2").value.trim();
        const valorX = document.getElementById("valorXInput").value.trim();
        const bitsValue = document.getElementById("bitsInput2").value.trim();

        if (ipIncompleta === "" || valorX === "" || bitsValue === "") {
            mostrarMensaje(resultadoSustitucion, "Por favor, llena todos los campos.", "warning"); return;
        }

        const ipFinal = ipIncompleta.replace(/[xX]+/g, () => valorX);
        procesarCalculoIP(ipFinal, bitsValue, resultadoSustitucion, `<div class="mb-2 text-warning"><small><em>IP Interpretada (XX=${esc(valorX)}): ${esc(ipFinal)}</em></small></div>`);
    });

    function procesarCalculoIP(ipValue, bitsValue, contenedor, htmlAdicional = "") {
        if (ipValue === "" || bitsValue === "") {
            mostrarMensaje(contenedor, "Por favor, ingresa la dirección IP y los bits.", "warning"); return;
        }

        if (!/^\d{1,2}$/.test(bitsValue)) {
            mostrarMensaje(contenedor, `${htmlAdicional}Los bits de red deben ser un número del 0 al 32.`, "danger"); return;
        }

        const cidr = parseInt(bitsValue, 10);
        if (!esIPv4Valida(ipValue) || cidr < 0 || cidr > 32) {
            mostrarMensaje(contenedor, `${htmlAdicional}Formato de IP incorrecto o prefijo CIDR fuera de rango (0-32).`, "danger"); return;
        }

        const ipOctetos = ipValue.split('.').map(Number);
        const maskOctetos = calcularMascara(cidr);
        const wildcardOctetos = maskOctetos.map(m => 255 - m);
        const redOctetos = calcularRed(ipOctetos, maskOctetos);
        const broadcastOctetos = calcularBroadcast(redOctetos, wildcardOctetos);

        if (ipOctetos.join('.') === redOctetos.join('.')) {
            let hostMinOctetos = [], hostMaxOctetos = [], numHosts = 0;

            if (cidr === 32) { numHosts = 1; hostMinOctetos = [...redOctetos]; hostMaxOctetos = [...redOctetos]; }
            else if (cidr === 31) { numHosts = 2; hostMinOctetos = [...redOctetos]; hostMaxOctetos = [...broadcastOctetos]; }
            else {
                numHosts = Math.pow(2, 32 - cidr) - 2;
                hostMinOctetos = intToIp(ipToInt(redOctetos) + 1);
                hostMaxOctetos = intToIp(ipToInt(broadcastOctetos) - 1);
            }

            const datosRedCalculada = {
                direccion: `${ipValue}/${cidr}`,
                mascara: maskOctetos.join('.'),
                hostMin: hostMinOctetos.join('.'),
                hostMax: hostMaxOctetos.join('.'),
                broadcast: broadcastOctetos.join('.'),
                hosts: numHosts.toLocaleString(),
                hostsCrudo: numHosts,
                interfaces: [], dhcpPools: [], ripNetworks: [], dhcpHabilitado: false, ripHabilitado: false,
                scriptGenerado: null, auditoriaLogs: []
            };

            const textoParaCopiar = `Dirección: ${ipValue}\nMáscara: ${datosRedCalculada.mascara}\nPrimer host: ${datosRedCalculada.hostMin}\nÚltimo host/Gateway: ${datosRedCalculada.hostMax}\nBroadcast: ${datosRedCalculada.broadcast}\nHosts soportados: ${datosRedCalculada.hosts}`;

            contenedor.innerHTML = `
                <div class="alert alert-success p-0 overflow-hidden shadow-sm mb-0" role="alert">
                    <div class="bg-success text-white px-3 py-2 fw-bold d-flex justify-content-between align-items-center">
                        <span>¡Dirección Válida!</span>
                        <button class="btn btn-sm btn-light py-0 px-2 btn-copiar-calculo" style="font-size: 0.8rem;" title="Copiar">Copiar</button>
                    </div>
                    <div class="p-3 bg-dark text-info font-monospace" style="font-size: 1rem; line-height: 1.8;">
                        ${htmlAdicional}
                        <span class="text-secondary">Dirección:</span> <span class="text-light">${esc(ipValue)}</span><br>
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

            contenedor.querySelector('.btn-copiar-calculo').addEventListener('click', (e) => {
                copiarAlPortapapeles(textoParaCopiar, e.target, "Copiar", "btn-light", "btn-success");
            });

            contenedor.querySelector('.btn-guardar-nodo').addEventListener('click', () => {
                if (!guardEdit()) return;
                const clienteNombre = contenedor.querySelector('.input-cliente').value.trim();
                if (clienteNombre === "") { alert("Por favor, ingresa un nombre."); return; }
                
                if (listaNodos.some(n => n.cliente.toLowerCase() === clienteNombre.toLowerCase())) {
                    alert(`El nodo "${clienteNombre}" ya existe en la lista.`); return;
                }

                guardarNodoLista(clienteNombre, JSON.parse(JSON.stringify(datosRedCalculada)));
                contenedor.querySelector('.input-cliente').value = "";
            });

        } else {
            mostrarMensaje(contenedor, `${htmlAdicional}<h5 class="alert-heading mt-2">Dirección Inválida</h5><p>La dirección <strong>${esc(ipValue)}/${cidr}</strong> contiene bits de host activos.</p><hr><p class="mb-0">Dirección de red base correcta: <strong>${redOctetos.join('.')}</strong></p>`, "danger");
        }
    }

    // --- Módulo Matemático de Auditoría IP ---
    function auditarNodo(nodo) {
        const logs = [];
        const redesInterfaces = [];
        const ipsAsignadas = new Set();
        let usaRedDelNodo = false;

        const nodoNetIp = nodo.direccion.split('/')[0];
        let nodoNetInt = 0, nodoMaskInt = 0, nodoAuditable = true;
        if (!nodoNetIp || !esIPv4Valida(nodoNetIp) || !esMascaraValida(nodo.mascara)) {
            logs.push({ tipo: 'danger', texto: `El nodo carece de una red principal válida configurada. Auditoría parcial.` });
            nodoAuditable = false;
        } else {
            nodoNetInt = ipToInt(nodoNetIp.split('.').map(Number));
            nodoMaskInt = ipToInt(nodo.mascara.split('.').map(Number));
        }

        if (nodo.interfaces.length === 0) {
            logs.push({ tipo: 'warning', texto: `El nodo no tiene interfaces configuradas.` });
        }

        nodo.interfaces.forEach(intf => {
            const nombre = intf.nombre.toUpperCase();

            if (!intf.ip || !intf.mascara) {
                logs.push({ tipo: 'danger', texto: `Puerto ${nombre}: Falta configurar IP y máscara.` });
            } else if (!esIPv4Valida(intf.ip) || !esMascaraValida(intf.mascara)) {
                logs.push({ tipo: 'danger', texto: `Puerto ${nombre}: IP o máscara inválidas (${intf.ip} / ${intf.mascara}).` });
            } else {
                if (ipsAsignadas.has(intf.ip)) {
                    logs.push({ tipo: 'danger', texto: `Puerto ${nombre}: IP duplicada (${intf.ip}) en este mismo dispositivo.` });
                }
                ipsAsignadas.add(intf.ip);

                const ipOct = intf.ip.split('.').map(Number);
                const maskOct = intf.mascara.split('.').map(Number);
                const redOct = calcularRed(ipOct, maskOct);
                const prefijo = contarBitsMascara(maskOct);
                const ipInt = ipToInt(ipOct);
                const maskInt = ipToInt(maskOct);
                const netStr = redOct.join('.');

                let solapamiento = false;
                for (let r of redesInterfaces) {
                    const maskComun = (maskInt & r.maskInt) >>> 0;
                    if (((ipInt & maskComun) >>> 0) === ((r.ipInt & maskComun) >>> 0)) {
                        logs.push({ tipo: 'danger', texto: `Puerto ${nombre}: La subred (${netStr}/${prefijo}) se solapa con ${r.nombre} (${r.netStr}/${r.prefijo}).` });
                        solapamiento = true;
                    }
                }
                redesInterfaces.push({ nombre, ipInt, maskInt, netStr, prefijo });

                if (nodoAuditable && ((ipInt & nodoMaskInt) >>> 0) === nodoNetInt) {
                    usaRedDelNodo = true;
                }

                const bcastOct = calcularBroadcast(redOct, maskOct.map(m => 255 - m));
                const ipStr = ipOct.join('.');
                
                if (prefijo === 32) {
                    logs.push({ tipo: 'warning', texto: `Puerto ${nombre}: la IP ${intf.ip} usa /32. Válido solo en interfaces lógicas (Loopbacks).` });
                } else if (prefijo === 31) {
                    logs.push({ tipo: 'success', texto: `Puerto ${nombre}: IP ${intf.ip} en enlace p2p /31 (RFC 3021), válida.` });
                } else if (ipStr === netStr) {
                    logs.push({ tipo: 'danger', texto: `Puerto ${nombre}: La IP ${intf.ip} es dirección de RED (.0), inválida para un host.` });
                } else if (ipStr === bcastOct.join('.')) {
                    logs.push({ tipo: 'danger', texto: `Puerto ${nombre}: La IP ${intf.ip} es dirección de BROADCAST, inválida para un host.` });
                } else if (!solapamiento) {
                    logs.push({ tipo: 'success', texto: `Puerto ${nombre}: IP ${intf.ip} es un host válido.` });
                }
            }
        });

        if (nodoAuditable && !usaRedDelNodo && nodo.interfaces.length > 0) {
            logs.push({ tipo: 'warning', texto: `Ninguna interfaz del router pertenece a la red principal asignada al nodo (${nodo.direccion}).` });
        }

        if (nodo.dhcpHabilitado) {
            if (nodo.dhcpPools.length === 0) {
                logs.push({ tipo: 'warning', texto: `DHCP habilitado pero sin pools configurados.` });
            } else {
                nodo.dhcpPools.forEach(pool => {
                    if (!pool || !pool.red || !pool.mascara || !esIPv4Valida(pool.red) || !esMascaraValida(pool.mascara)) {
                        logs.push({ tipo: 'danger', texto: `DHCP [${esc(pool?.nombre || 'sin-nombre')}]: red o máscara corrupta o faltante.` });
                        return;
                    }
                    const netOct = pool.red.split('.').map(Number);
                    const maskOct = pool.mascara.split('.').map(Number);
                    const calcRedOct = calcularRed(netOct, maskOct);

                    if (netOct.join('.') !== calcRedOct.join('.')) {
                        logs.push({ tipo: 'danger', texto: `DHCP [${pool.nombre}]: La red declarada (${pool.red}) no coincide con su máscara. Debería ser ${calcRedOct.join('.')}` });
                    } else {
                        logs.push({ tipo: 'success', texto: `DHCP [${pool.nombre}]: Dirección de red y máscara congruentes.` });
                    }
                    
                    const poolNetInt = ipToInt(netOct);
                    let tieneInterfaz = false;
                    for (let r of redesInterfaces) {
                        if (r.ipInt !== 0 && ((r.ipInt & ipToInt(maskOct)) >>> 0) === poolNetInt) {
                            tieneInterfaz = true; break;
                        }
                    }
                    if (!tieneInterfaz && nodo.interfaces.length > 0) {
                        logs.push({ tipo: 'warning', texto: `DHCP [${pool.nombre}]: Ninguna interfaz física configurada pertenece a esta red. Los clientes conectados no recibirán IP.` });
                    }
                });
            }
        }
        
        if (nodo.ripHabilitado && nodo.ripNetworks.length > 0) {
            nodo.ripNetworks.forEach(net => {
                const oct = net.split('.').map(Number);
                const cls = oct[0] < 128 ? 8 : (oct[0] < 192 ? 16 : 24);
                const maskCls = calcularMascara(cls);
                const redCalc = calcularRed(oct, maskCls);
                if (oct.join('.') !== redCalc.join('.')) {
                    logs.push({ tipo: 'warning', texto: `RIP: La dirección ${net} no coincide con una red de clase estándar para ${oct[0]}.0.0.0 (se resume a classful en IOS: ${redCalc.join('.')}).` });
                }
            });
        }

        return logs;
    }

    // --- Tabla Maestra de Nodos ---
    function guardarNodoLista(cliente, datosRed) {
        listaNodos.push(normalizarNodo({ cliente, ...datosRed }));
        historialBorrados.length = 0;
        renderizarTabla();
    }

    function renderizarTabla() {
        btnDeshacer.style.display = historialBorrados.length > 0 ? "inline-block" : "none";
        
        if (listaNodos.length > 0 || historialBorrados.length > 0) seccionTabla.style.display = "flex";
        else { seccionTabla.style.display = "none"; nodoSeleccionadoIndex = null; }

        if (listaNodos.length === 0 && historialBorrados.length > 0) {
            tablaNodosBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-3">Todos los nodos eliminados. Puedes deshacer la acción.</td></tr>`;
        } else {
            tablaNodosBody.innerHTML = listaNodos.map((nodo, index) => {
                const isSelected = index === nodoSeleccionadoIndex;
                const totalIntf = nodo.interfaces.length;
                return `
                    <tr class="fila-nodo ${isSelected ? 'table-primary border-primary' : ''}" data-index="${index}">
                        <td class="fw-bold ${isSelected ? 'text-dark' : 'text-primary'}">${esc(nodo.cliente)}</td>
                        <td><span class="badge ${isSelected ? 'bg-primary' : 'bg-secondary'}">${esc(nodo.direccion)}</span></td>
                        <td><span class="copy-click" title="Clic para copiar">${esc(nodo.mascara)}</span></td>
                        <td><span class="copy-click" title="Clic para copiar">${esc(nodo.hostMin)}</span></td>
                        <td><span class="copy-click" title="Clic para copiar">${esc(nodo.hostMax)}</span></td>
                        <td><span class="copy-click" title="Clic para copiar">${esc(nodo.broadcast)}</span></td>
                        <td>${esc(nodo.hosts)}</td>
                        <td><span class="badge bg-${totalIntf > 0 ? 'success' : 'light text-dark'} border">${totalIntf}</span></td>
                        <td><button class="btn btn-sm btn-outline-danger btn-eliminar" data-index="${index}">Eliminar</button></td>
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

    // --- Configuración de Interfaces ---
    function renderizarConfiguracion() {
        if (nodoSeleccionadoIndex === null || !listaNodos[nodoSeleccionadoIndex]) {
            seccionConfiguracion.style.display = "none"; intfEditIndex = null; return;
        }

        const nodo = listaNodos[nodoSeleccionadoIndex];
        seccionConfiguracion.style.display = "flex";
        tituloConfiguracion.innerHTML = `Gestión de Interfaces: <span class="text-dark border-bottom border-2 border-primary">${esc(nodo.cliente)}</span>`;

        if (nodo.interfaces.length === 0) {
            listaInterfaces.innerHTML = `<li class="list-group-item text-center text-muted fst-italic py-3">No hay interfaces conectadas.</li>`;
        } else {
            listaInterfaces.innerHTML = nodo.interfaces.map((intf, index) => {
                if (index === intfEditIndex) {
                    const esSerial = intf.nombre.toLowerCase().startsWith('s');
                    let htmlClock = "";
                    if (esSerial) {
                        htmlClock = `
                        <div class="d-flex flex-column flex-md-row align-items-md-center gap-3 mt-2 border-top pt-3">
                            <div class="form-check form-switch">
                                <input class="form-check-input check-clock-rate" type="checkbox" id="inlineCheckClock_${index}" data-index="${index}" ${intf.clockRate ? 'checked' : ''}>
                                <label class="form-check-label fw-bold text-muted" style="font-size: 0.85rem;" for="inlineCheckClock_${index}">Clock Rate (DCE)</label>
                            </div>
                            <div id="containerClockValue_${index}" style="display: ${intf.clockRate ? 'block' : 'none'};">
                                <input type="number" id="inlineClockValue_${index}" class="form-control form-control-sm border-warning" placeholder="Valor (Ej. 64000)" value="${esc(intf.clockRateValue || '')}">
                            </div>
                        </div>`;
                    }

                    return `
                    <li class="list-group-item py-3 px-3 mb-2 border-primary border-2 rounded shadow-sm bg-light">
                        <div class="fw-bold text-primary mb-3"><span class="badge bg-primary me-2">Editando</span>${esc(intf.nombre.toUpperCase())}</div>
                        <div class="row g-2">
                            <div class="col-md-6 mb-2">
                                <label class="form-label fw-bold text-secondary mb-1" style="font-size: 0.8rem;">Dirección IP o Red:</label>
                                <input type="text" id="inlineIp_${index}" class="form-control form-control-sm border-primary" placeholder="Ej. 192.168.10.1" value="${esc(intf.ip || '')}">
                            </div>
                            <div class="col-md-6 mb-2">
                                <label class="form-label fw-bold text-secondary mb-1" style="font-size: 0.8rem;">Máscara de Subred:</label>
                                <input type="text" id="inlineMask_${index}" class="form-control form-control-sm border-primary" placeholder="Ej. 255.255.255.0" value="${esc(intf.mascara || '')}">
                            </div>
                            <div class="col-md-12 mb-2">
                                <label class="form-label fw-bold text-secondary mb-1" style="font-size: 0.8rem;">IP Helper-Address (Opcional):</label>
                                <input type="text" id="inlineHelper_${index}" class="form-control form-control-sm border-info" placeholder="Ej. 192.168.20.5" value="${esc(intf.helper || '')}">
                            </div>
                        </div>
                        ${htmlClock}
                        <div class="d-flex justify-content-end gap-2 mt-3">
                            <button class="btn btn-sm btn-secondary btn-cancelar-inline">Cancelar</button>
                            <button class="btn btn-sm btn-success fw-bold btn-guardar-inline" data-index="${index}">💾 Guardar Cambios</button>
                        </div>
                    </li>`;
                }

                const esSerial = intf.nombre.toLowerCase().startsWith('s');
                const clockBadge = (esSerial && intf.clockRate) ? `<span class="badge bg-warning text-dark ms-2 border border-secondary" style="font-size: 0.65rem;">⏱ CLOCK: ${esc(intf.clockRateValue)}</span>` : '';
                const helperBadge = intf.helper ? `<span class="badge bg-info text-dark ms-2 border border-secondary" style="font-size: 0.65rem;">HELPER: ${esc(intf.helper)}</span>` : '';
                const estadoConfig = (intf.ip && intf.mascara)
                    ? `<div class="text-muted font-monospace mt-1" style="font-size: 0.85rem;">IP: <span class="text-dark fw-bold">${esc(intf.ip)}</span> | Mask: <span class="text-dark fw-bold">${esc(intf.mascara)}</span></div>`
                    : `<div class="text-danger fst-italic mt-1" style="font-size: 0.80rem;">⚠️ Falta configurar red y máscara</div>`;

                return `
                <li class="list-group-item d-flex justify-content-between align-items-center py-2 px-3 mb-2 border rounded shadow-sm">
                    <div>
                        <div>
                            <span class="badge bg-secondary me-1">INT</span><strong class="font-monospace text-primary fs-6">${esc(intf.nombre.toUpperCase())}</strong>
                            ${clockBadge}${helperBadge}
                        </div>
                        ${estadoConfig}
                    </div>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary fw-bold btn-configurar-intf" data-intf-index="${index}">Configurar</button>
                        <button class="btn btn-outline-danger fw-bold btn-quitar-intf" data-intf-index="${index}" title="Eliminar Interfaz">X</button>
                    </div>
                </li>`;
            }).join('');
        }
    }

    function agregarInterfazHandler() {
        if (!guardEdit()) return;
        const nodo = nodoActual();
        if (!nodo) { alert("Selecciona un nodo primero."); return; }
        const valorIntf = inputInterfaz.value.trim().toLowerCase();
        
        if (valorIntf === "") return;

        if (!/^[fgs]\d+\/\d+(\/\d+)?$/.test(valorIntf)) { alert("Formato inválido. Usa f, g o s. Ej: f0/0, g0/1/0, s0/0"); return; }
        if (nodo.interfaces.some(intf => intf.nombre === valorIntf)) { alert(`La interfaz ya existe.`); return; }

        nodo.interfaces.push({ nombre: valorIntf, ip: null, mascara: null, clockRate: false, clockRateValue: null, helper: null });
        invalidarScript(nodo);
        inputInterfaz.value = "";
        renderizarTabla();
    }

    btnAgregarInterfaz.addEventListener("click", agregarInterfazHandler);
    inputInterfaz.addEventListener("keypress", function (event) {
        if (event.key === "Enter") { event.preventDefault(); agregarInterfazHandler(); }
    });

    listaInterfaces.addEventListener("change", function (event) {
        if (event.target.classList.contains("check-clock-rate")) {
            const index = parseInt(event.target.getAttribute("data-index"), 10);
            const inputContainer = document.getElementById(`containerClockValue_${index}`);
            if (inputContainer) {
                inputContainer.style.display = event.target.checked ? "block" : "none";
                if (!event.target.checked) {
                    const valInput = document.getElementById(`inlineClockValue_${index}`);
                    if (valInput) valInput.value = "";
                }
            }
        }
    });

    listaInterfaces.addEventListener("click", function (event) {
        const nodo = nodoActual();
        if (!nodo) return;

        if (event.target.classList.contains("btn-quitar-intf")) {
            if (!guardEdit()) return;
            nodo.interfaces.splice(parseInt(event.target.getAttribute("data-intf-index"), 10), 1);
            invalidarScript(nodo);
            renderizarTabla();
        }

        if (event.target.classList.contains("btn-configurar-intf")) {
            if (!guardEdit()) return;
            intfEditIndex = parseInt(event.target.getAttribute("data-intf-index"), 10);
            renderizarTabla();
        }

        if (event.target.classList.contains("btn-cancelar-inline")) {
            intfEditIndex = null; renderizarTabla();
        }

        if (event.target.classList.contains("btn-guardar-inline")) {
            const index = parseInt(event.target.getAttribute("data-index"), 10);
            const intfActual = nodo.interfaces[index];
            const esSerial = intfActual.nombre.toLowerCase().startsWith('s');

            const inputIp = document.getElementById(`inlineIp_${index}`).value.trim();
            const inputMask = document.getElementById(`inlineMask_${index}`).value.trim();
            const inputHelper = document.getElementById(`inlineHelper_${index}`).value.trim();
            
            const checkClockElement = document.getElementById(`inlineCheckClock_${index}`);
            const checkClock = (esSerial && checkClockElement) ? checkClockElement.checked : false;
            const inputClockVal = checkClock ? document.getElementById(`inlineClockValue_${index}`).value.trim() : null;

            if (inputIp === "" || inputMask === "") { alert("Por favor, ingresa la IP y la Máscara."); return; }
            if (!esIPv4Valida(inputIp)) { alert("La Dirección IP ingresada no es válida."); return; }
            if (!esMascaraValida(inputMask)) { alert("La Máscara ingresada no es válida (bits contiguos)."); return; }
            if (inputHelper !== "" && !esIPv4Valida(inputHelper)) { alert("La dirección Helper IP no es válida."); return; }
            if (checkClock && inputClockVal === "") { alert("Ingresa el valor del Clock Rate."); return; }

            intfActual.ip = inputIp;
            intfActual.mascara = inputMask;
            intfActual.helper = inputHelper !== "" ? inputHelper : null;
            intfActual.clockRate = checkClock;
            intfActual.clockRateValue = inputClockVal;

            invalidarScript(nodo);
            intfEditIndex = null;
            renderizarTabla();
        }
    });

    btnCerrarConfiguracion.addEventListener("click", () => {
        if (!guardEdit()) return;
        nodoSeleccionadoIndex = null; renderizarTabla();
    });

    // --- Panel Menú Nodo ---
    function renderizarMenuNodo() {
        if (nodoSeleccionadoIndex === null || !listaNodos[nodoSeleccionadoIndex]) {
            seccionMenuNodo.style.display = "none"; seccionRouter.style.display = "none"; panelAuditoria.style.display = "none"; return;
        }
        const nodo = listaNodos[nodoSeleccionadoIndex];
        seccionMenuNodo.style.display = "flex";
        nombreNodoMenu.textContent = nodo.cliente;
        checkHabilitarDhcp.checked = !!nodo.dhcpHabilitado;
        formularioDhcp.style.display = nodo.dhcpHabilitado ? "block" : "none";
        checkHabilitarRip.checked = !!nodo.ripHabilitado;
        formularioRip.style.display = nodo.ripHabilitado ? "block" : "none";
    }

    btnOpcionRouter.addEventListener("click", () => {
        seccionRouter.style.display = "flex"; seccionRouter.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    btnCerrarRouter.addEventListener("click", () => { seccionRouter.style.display = "none"; });

    checkHabilitarDhcp.addEventListener("change", function () {
        if (!guardEdit()) { this.checked = !this.checked; return; }
        const nodo = nodoActual(); if (!nodo) return;
        nodo.dhcpHabilitado = this.checked; invalidarScript(nodo); renderizarTabla();
    });

    checkHabilitarRip.addEventListener("change", function () {
        if (!guardEdit()) { this.checked = !this.checked; return; }
        const nodo = nodoActual(); if (!nodo) return;
        nodo.ripHabilitado = this.checked; invalidarScript(nodo); renderizarTabla();
    });

    // --- DHCP ---
    function renderizarDhcpPools() {
        if (nodoSeleccionadoIndex === null || !listaNodos[nodoSeleccionadoIndex]) {
            listaDhcpPools.innerHTML = ""; return;
        }
        const nodo = listaNodos[nodoSeleccionadoIndex];
        if (nodo.dhcpPools.length === 0) listaDhcpPools.innerHTML = `<li class="list-group-item text-muted small py-2">No hay pools configurados.</li>`;
        else {
            listaDhcpPools.innerHTML = nodo.dhcpPools.map((pool, index) => `
                <li class="list-group-item d-flex justify-content-between py-2 px-3 mb-2 border border-success rounded">
                    <div><div class="fw-bold text-success">${esc(pool.nombre)}</div><div class="text-muted font-monospace" style="font-size:0.75rem;">Red: ${esc(pool.red)} | Mask: ${esc(pool.mascara)}</div></div>
                    <button class="btn btn-sm btn-outline-danger fw-bold btn-quitar-dhcp" data-dhcp-index="${index}">X</button>
                </li>
            `).join('');
        }
    }

    btnAgregarDhcp.addEventListener("click", () => {
        if (!guardEdit()) return;
        const nodo = nodoActual(); if (!nodo) return;

        const pool = dhcpPoolName.value.trim();
        const exc = dhcpExcluidas.value.trim();
        const net = dhcpRed.value.trim();
        const mask = dhcpMascara.value.trim();
        const gw = dhcpGateway.value.trim();
        const dns = dhcpDns.value.trim();

        if (pool === "" || net === "" || mask === "") { alert("Nombre, Red y Máscara son obligatorios."); return; }
        if (/\s/.test(pool)) { alert("El nombre del pool no debe contener espacios."); return; }
        if (!esIPv4Valida(net)) { alert("La IP de Red es inválida."); return; }
        if (!esMascaraValida(mask)) { alert("La Máscara no es válida."); return; }
        
        const poolNetInt = ipToInt(net.split('.').map(Number));
        const poolMaskInt = ipToInt(mask.split('.').map(Number));

        if (gw !== "") {
            if (!esIPv4Valida(gw)) { alert("El Gateway es inválido."); return; }
            if (((ipToInt(gw.split('.').map(Number)) & poolMaskInt) >>> 0) !== poolNetInt) {
                alert("El Gateway no pertenece a la red del DHCP."); return;
            }
        }
        if (dns !== "" && !esIPv4Valida(dns)) { alert("El DNS es inválido."); return; }

        if (exc !== "") {
            const ipsExcluidas = exc.split(/[\s,]+/).filter(i => i.trim() !== "");
            for (let i of ipsExcluidas) {
                if (!esIPv4Valida(i)) { alert(`IP a excluir "${i}" es inválida.`); return; }
                if (((ipToInt(i.split('.').map(Number)) & poolMaskInt) >>> 0) !== poolNetInt) {
                    alert(`La IP a excluir "${i}" no pertenece a la red del DHCP.`); return;
                }
            }
        }

        if (nodo.dhcpPools.some(p => p.nombre.toLowerCase() === pool.toLowerCase())) { alert("El Pool ya existe."); return; }

        nodo.dhcpPools.push({ nombre: pool, excluidas: exc !== "" ? exc : null, red: net, mascara: mask, gateway: gw || null, dns: dns || null });
        invalidarScript(nodo);
        dhcpPoolName.value = ""; dhcpExcluidas.value = ""; dhcpRed.value = ""; dhcpMascara.value = ""; dhcpGateway.value = ""; dhcpDns.value = "";
        renderizarTabla();
    });

    listaDhcpPools.addEventListener("click", function (event) {
        if (event.target.classList.contains("btn-quitar-dhcp")) {
            if (!guardEdit()) return;
            const nodo = nodoActual(); if (!nodo) return;
            nodo.dhcpPools.splice(parseInt(event.target.getAttribute("data-dhcp-index"), 10), 1);
            invalidarScript(nodo); renderizarTabla();
        }
    });

    // --- RIPv2 ---
    function renderizarRipNetworks() {
        if (nodoSeleccionadoIndex === null || !listaNodos[nodoSeleccionadoIndex]) {
            listaRipNetworks.innerHTML = ""; return;
        }
        const nodo = listaNodos[nodoSeleccionadoIndex];
        if (nodo.ripNetworks.length === 0) listaRipNetworks.innerHTML = `<li class="list-group-item text-muted small py-2">No hay redes agregadas.</li>`;
        else {
            listaRipNetworks.innerHTML = nodo.ripNetworks.map((net, index) => `
                <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-2 mb-1 border rounded shadow-sm">
                    <span class="font-monospace text-dark fw-bold">${esc(net)}</span>
                    <button class="btn btn-sm btn-outline-danger fw-bold btn-quitar-rip" data-rip-index="${index}">X</button>
                </li>
            `).join('');
        }
    }

    btnAgregarRipNetwork.addEventListener("click", () => {
        if (!guardEdit()) return;
        const nodo = nodoActual(); if (!nodo) return;
        const net = ripNetworkInput.value.trim();
        if (!esIPv4Valida(net)) { alert("Dirección de red inválida."); return; }
        if (nodo.ripNetworks.includes(net)) { alert("Esta red ya está en la lista."); return; }
        nodo.ripNetworks.push(net);
        invalidarScript(nodo); ripNetworkInput.value = ""; renderizarTabla();
    });

    listaRipNetworks.addEventListener("click", function (event) {
        if (event.target.classList.contains("btn-quitar-rip")) {
            if (!guardEdit()) return;
            const nodo = nodoActual(); if (!nodo) return;
            nodo.ripNetworks.splice(parseInt(event.target.getAttribute("data-rip-index"), 10), 1);
            invalidarScript(nodo); renderizarTabla();
        }
    });

    // --- Generación Script y Auditoría ---
    btnGenerarConfigRouter.addEventListener("click", () => {
        if (!guardEdit()) return;
        const nodo = nodoActual(); if (!nodo) return;

        const logsAuditoria = auditarNodo(nodo);
        nodo.auditoriaLogs = logsAuditoria;

        panelAuditoria.style.display = "block";
        panelAuditoria.innerHTML = `
            <div class="alert ${logsAuditoria.some(l => l.tipo === 'danger') ? 'alert-danger' : 'alert-success'} shadow-sm">
                <h6 class="fw-bold mb-2">🔍 Reporte de Auditoría Matemática:</h6>
                <ul class="mb-0 small font-monospace">${logsAuditoria.map(log => `<li>${log.tipo === 'danger' ? '❌' : (log.tipo === 'warning' ? '⚠️' : '✅')} ${esc(log.texto)}</li>`).join('')}</ul>
            </div>
        `;

        let cli = "enable\nconfigure terminal\n";

        if (nodo.dhcpHabilitado && nodo.dhcpPools.length > 0) {
            nodo.dhcpPools.forEach(pool => {
                if (pool.excluidas) {
                    const ipsExcluidas = pool.excluidas.split(/[\s,]+/).filter(i => i.trim() !== "");
                    ipsExcluidas.forEach(ip => cli += `ip dhcp excluded-address ${ip}\n`);
                }
                cli += `ip dhcp pool ${pool.nombre}\nnetwork ${pool.red} ${pool.mascara}\n`;
                if (pool.gateway) cli += `default-router ${pool.gateway}\n`;
                if (pool.dns) cli += `dns-server ${pool.dns}\n`;
                cli += `exit\n`;
            });
        }

        if (nodo.ripHabilitado && nodo.ripNetworks.length > 0) {
            cli += `router rip\nversion 2\nno auto-summary\n`;
            nodo.ripNetworks.forEach(net => cli += `network ${net}\n`);
            cli += `exit\n`;
        }

        if (nodo.interfaces.length > 0) {
            nodo.interfaces.forEach(intf => {
                let nombreCompleto = intf.nombre.startsWith('f') ? intf.nombre.replace('f', 'fastEthernet ') :
                                     intf.nombre.startsWith('g') ? intf.nombre.replace('g', 'gigabitEthernet ') :
                                     intf.nombre.startsWith('s') ? intf.nombre.replace('s', 'serial ') : intf.nombre;
                cli += `interface ${nombreCompleto}\n`;
                if (intf.ip && intf.mascara) cli += `ip address ${intf.ip} ${intf.mascara}\n`;
                if (intf.helper) cli += `ip helper-address ${intf.helper}\n`;
                const esSerial = intf.nombre.toLowerCase().startsWith('s');
                if (esSerial && intf.clockRate && intf.clockRateValue) cli += `clock rate ${intf.clockRateValue}\n`;
                cli += `no shutdown\nexit\n`;
            });
        }

        cli += "exit\nwrite memory\n";
        terminalRouter.textContent = cli;
        btnListoRouter.style.display = "inline-block";
        guardarDatosStorage();
    });

    btnCopiarRouter.addEventListener("click", () => {
        copiarAlPortapapeles(terminalRouter.textContent, btnCopiarRouter, "📋 Copiar Todo", "btn-outline-secondary", "btn-success");
    });

    btnListoRouter.addEventListener("click", () => {
        const nodo = nodoActual();
        if (nodo) {
            nodo.scriptGenerado = terminalRouter.textContent;
            renderizarTabla();
            seccionResumenNodos.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    function renderizarResumenNodos() {
        const nodosConfigurados = listaNodos.filter(n => n.scriptGenerado);
        if (nodosConfigurados.length > 0) seccionResumenNodos.style.display = "flex";
        else { seccionResumenNodos.style.display = "none"; return; }

        acordeonResumenNodos.innerHTML = nodosConfigurados.map((nodo) => {
            const indexReal = listaNodos.indexOf(nodo);
            const semaforoBadge = nodo.auditoriaLogs.some(l => l.tipo === 'danger') ? `<span class="badge bg-danger ms-2">🔴 Error IP</span>` : `<span class="badge bg-success ms-2">🟢 OK IP</span>`;

            const desgloseIntf = nodo.interfaces.length > 0 ? nodo.interfaces.map(intf => `<li class="list-group-item py-1 px-2 d-flex justify-content-between"><span class="fw-bold">${esc(intf.nombre.toUpperCase())}</span><span class="font-monospace text-muted">${intf.ip ? esc(intf.ip) : 'Sin IP'}</span></li>`).join('') : `<li class="list-group-item text-muted small">Sin interfaces</li>`;
            const dhcpActivo = nodo.dhcpHabilitado && nodo.dhcpPools.length > 0;
            const desgloseDhcp = dhcpActivo ? nodo.dhcpPools.map(pool => `<li class="list-group-item py-1 px-2 d-flex justify-content-between"><span class="fw-bold text-success">${esc(pool.nombre)}</span><span class="font-monospace text-muted">${esc(pool.red)}</span></li>`).join('') : `<li class="list-group-item text-muted small">Sin DHCP</li>`;
            const ripActivo = nodo.ripHabilitado && nodo.ripNetworks.length > 0;
            const desgloseRip = ripActivo ? nodo.ripNetworks.map(net => `<li class="list-group-item py-1 px-2 font-monospace">${esc(net)}</li>`).join('') : `<li class="list-group-item text-muted small">Sin RIPv2</li>`;
            const auditList = nodo.auditoriaLogs.length > 0 ? nodo.auditoriaLogs.map(l => `<li class="list-group-item py-1 px-2 small font-monospace">${l.tipo === 'danger' ? '❌' : (l.tipo === 'warning' ? '⚠️' : '✅')} ${esc(l.texto)}</li>`).join('') : `<li class="list-group-item text-muted small">Sin auditoría</li>`;

            return `
            <div class="accordion-item mb-2 border shadow-sm">
                <h2 class="accordion-header"><button class="accordion-button collapsed fw-bold text-dark bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${indexReal}">
                    ✅ ${esc(nodo.cliente)} <span class="badge bg-secondary ms-2">${esc(nodo.direccion)}</span> ${semaforoBadge}
                    <span class="ms-auto me-3 d-none d-md-block"><span class="badge bg-primary me-1">${nodo.interfaces.length} INTs</span><span class="badge bg-success me-1">${dhcpActivo ? nodo.dhcpPools.length : 0} DHCPs</span><span class="badge bg-dark">${ripActivo ? nodo.ripNetworks.length : 0} RIPs</span></span>
                </button></h2>
                <div id="collapse_${indexReal}" class="accordion-collapse collapse" data-bs-parent="#acordeonResumenNodos">
                    <div class="accordion-body bg-white border-top">
                        <div class="row mb-4">
                            <div class="col-md-3"><h6 class="fw-bold text-primary border-bottom pb-1">Interfaces</h6><ul class="list-group list-group-flush">${desgloseIntf}</ul></div>
                            <div class="col-md-3"><h6 class="fw-bold text-success border-bottom pb-1">Pools DHCP</h6><ul class="list-group list-group-flush">${desgloseDhcp}</ul></div>
                            <div class="col-md-3"><h6 class="fw-bold text-dark border-bottom pb-1">Redes RIPv2</h6><ul class="list-group list-group-flush">${desgloseRip}</ul></div>
                            <div class="col-md-3"><h6 class="fw-bold text-danger border-bottom pb-1">Diagnóstico IP</h6><ul class="list-group list-group-flush">${auditList}</ul></div>
                        </div>
                        <div class="d-flex justify-content-between mb-2"><span class="text-muted fw-bold small">Script CLI:</span><button class="btn btn-sm btn-outline-primary btn-copiar-resumen fw-bold" data-script="${encodeURIComponent(nodo.scriptGenerado)}">📋 Copiar Script</button></div>
                        <pre class="bg-dark text-success p-3 rounded font-monospace m-0">${esc(nodo.scriptGenerado)}</pre>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    acordeonResumenNodos.addEventListener("click", function (event) {
        if (event.target.classList.contains("btn-copiar-resumen")) {
            copiarAlPortapapeles(decodeURIComponent(event.target.getAttribute("data-script")), event.target, "📋 Copiar Script", "btn-outline-primary", "btn-success");
        }
    });

    btnDeshacer.addEventListener("click", () => {
        if (historialBorrados.length > 0) {
            const r = historialBorrados.pop();
            listaNodos.splice(r.index, 0, r.nodo);
            if (nodoSeleccionadoIndex !== null && nodoSeleccionadoIndex >= r.index) nodoSeleccionadoIndex++;
            renderizarTabla();
        }
    });

    tablaNodosBody.addEventListener("click", function (event) {
        if (event.target.closest(".copy-click")) {
            event.stopPropagation();
            const span = event.target.closest(".copy-click");
            copiarAlPortapapeles(span.textContent.trim(), null, "");
            const originalBg = span.style.backgroundColor; const originalColor = span.style.color;
            span.style.backgroundColor = "#198754"; span.style.color = "white";
            setTimeout(() => { span.style.backgroundColor = originalBg; span.style.color = originalColor; }, 800);
            return;
        }

        if (event.target.closest(".btn-eliminar")) {
            if (!guardEdit()) return;
            const index = parseInt(event.target.closest(".btn-eliminar").getAttribute("data-index"), 10);
            historialBorrados.push({ index: index, nodo: listaNodos[index] });
            listaNodos.splice(index, 1);
            if (nodoSeleccionadoIndex === index) { nodoSeleccionadoIndex = null; intfEditIndex = null; }
            else if (nodoSeleccionadoIndex !== null && nodoSeleccionadoIndex > index) nodoSeleccionadoIndex--;
            renderizarTabla(); return;
        }

        const fila = event.target.closest(".fila-nodo");
        if (fila) {
            if (!guardEdit()) return;
            const index = parseInt(fila.getAttribute("data-index"), 10);
            nodoSeleccionadoIndex = (nodoSeleccionadoIndex === index) ? null : index;
            intfEditIndex = null; seccionRouter.style.display = "none"; panelAuditoria.style.display = "none";
            terminalRouter.textContent = TEXTO_TERMINAL_VACIO; btnListoRouter.style.display = "none";
            renderizarTabla();
        }
    });

    // --- Helpers Matemáticos ---
    function esIPv4Valida(ip) { return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip); }
    function esMascaraValida(m) { return esIPv4Valida(m) && /^1*0*$/.test(m.split('.').map(o => Number(o).toString(2).padStart(8, '0')).join('')); }
    function contarBitsMascara(maskOct) { return maskOct.reduce((acc, o) => acc + (o.toString(2).split('1').length - 1), 0); }
    function calcularMascara(cidr) { const m = []; for (let i = 0; i < 4; i++) { if (cidr >= 8) { m.push(255); cidr -= 8; } else if (cidr > 0) { m.push(256 - Math.pow(2, 8 - cidr)); cidr = 0; } else { m.push(0); } } return m; }
    function calcularRed(ipArray, maskArray) { return ipArray.map((octeto, i) => octeto & maskArray[i]); }
    function calcularBroadcast(redArray, wildcardArray) { return redArray.map((octeto, i) => octeto | wildcardArray[i]); }
    
    // --- ERROR CRÍTICO REPARADO AQUÍ ---
    function ipToInt(ipArray) { return ((ipArray[0] << 24) | (ipArray[1] << 16) | (ipArray[2] << 8) | ipArray[3]) >>> 0; }
    
    function intToIp(int) { return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255]; }
    function mostrarMensaje(contenedor, html, tipo) { contenedor.innerHTML = `<div class="alert alert-${tipo}" role="alert">${html}</div>`; }

    cargarDatosStorage();
});