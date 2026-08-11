// app.js - Main Controller for Lastgang Analyse Web-App

// --- DOM Elements & References ---
let screens = {};
let dropZone = null;
let fileInput = null;
let uploadProgress = null;
let fileNameDisplay = null;
let btnNewFile = null;
let tabBtns = [];
let tabContents = [];
let inputDateStart = null;
let inputDateEnd = null;
let selectAggregation = null;
let profileFilters = [];
let previousTimelineAggregation = null; // Preserves timeline aggregation when switching tabs
let currentAgnesMode = 'single';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    screens = {
        upload: document.getElementById('upload-screen'),
        dashboard: document.getElementById('dashboard-screen')
    };
    dropZone = document.getElementById('drop-zone');
    fileInput = document.getElementById('file-input');
    uploadProgress = document.getElementById('upload-progress');
    fileNameDisplay = document.getElementById('file-name-display');
    btnNewFile = document.getElementById('btn-new-file');
    tabBtns = document.querySelectorAll('.tab-btn');
    tabContents = document.querySelectorAll('.tab-content');
    inputDateStart = document.getElementById('date-start');
    inputDateEnd = document.getElementById('date-end');
    selectAggregation = document.getElementById('aggregation-select');
    profileFilters = document.getElementsByName('profile-filter');

    initCharts();
    setupEventListeners();
    setupHolidayEvents();
    updateThemeIcon();

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('Service Worker registered successfully:', reg.scope))
                .catch(err => console.warn('Service Worker registration failed:', err));
        });
    }
});

// --- Globally Accessible Zoom function ---
function zoomToTimeRange(start, end) {
    const minDate = globalDateRange.validMin || (rawData && rawData[0] ? rawData[0].dateObj : null);
    const maxDate = globalDateRange.validMax || (rawData && rawData.length > 0 ? rawData[rawData.length - 1].dateObj : null);

    if (!minDate || !maxDate) return;

    if (start < minDate) start = new Date(minDate.getTime());
    if (end > maxDate) end = new Date(maxDate.getTime());
    if (start > end) start = new Date(end.getTime());

    if (inputDateStart) inputDateStart.value = getLocalDateString(start);
    if (inputDateEnd) inputDateEnd.value = getLocalDateString(end);
    
    document.querySelectorAll('.btn-zoom').forEach(b => b.classList.remove('active'));
    
    globalDateRange.start = start;
    globalDateRange.end = new Date(end.getTime() + 86400000 - 1); 
    
    isManualAggregation = false;
    updateDashboard();
}

// --- Dynamically Render Dataset Checkboxes (Priority 3 - Multi-Comparison) ---
function renderDatasetCheckboxes(preserveChecked = false) {
    const container = document.getElementById('dataset-checkboxes-container');
    const section = document.getElementById('dataset-section');
    if (!container || !section) return;

    // Save checked states if preserving
    let previousChecked = {};
    if (preserveChecked) {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            previousChecked[cb.value] = cb.checked;
        });
    } else {
        activeDatasetIds = [0]; // Default first selection
        cachedAggregations = {}; // Clear caching map on new upload
    }

    container.innerHTML = '';

    if (allDatasets.length === 0) {
        section.classList.add('hidden');
        return;
    }

    if (allDatasets.length > 1) {
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
    }

    const colors = getDatasetColors(isDarkMode);

    allDatasets.forEach((ds, idx) => {
        const button = document.createElement('div');
        button.className = 'btn-dataset-select';
        button.title = ds.name; // Full name as tooltip on hover
        button.tabIndex = 0;
        button.setAttribute('role', 'button');
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                button.click();
            }
        });
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = idx;
        input.style.display = 'none'; // Hidden checkbox
        
        if (preserveChecked) {
            input.checked = previousChecked[idx] !== undefined ? previousChecked[idx] : (idx === 0);
        } else {
            input.checked = idx === 0;
        }
        button.classList.toggle('active', input.checked);
        
        // Create color indicator circle
        const color = colors[idx % colors.length];
        const indicator = document.createElement('span');
        indicator.className = 'color-indicator';
        indicator.style.display = 'inline-block';
        indicator.style.width = '8px';
        indicator.style.height = '8px';
        indicator.style.borderRadius = '50%';
        indicator.style.backgroundColor = color;
        indicator.style.marginRight = '8px';
        indicator.style.flexShrink = '0';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'dataset-name';
        
        const minDate = ds.data && ds.data.length > 0 ? ds.data[0].dateObj : null;
        const maxDate = ds.data && ds.data.length > 0 ? ds.data[ds.data.length - 1].dateObj : null;
        let elapsedDays = 0;
        if (minDate && maxDate) {
            const durationMs = maxDate.getTime() - minDate.getTime() + 15 * 60 * 1000;
            elapsedDays = durationMs / (1000 * 60 * 60 * 24);
        }
        const isIncomplete = elapsedDays > 0 && elapsedDays < 350.0;
        
        if (isIncomplete) {
            nameSpan.innerHTML = `${escapeHtml(ds.name)} <span style="color: var(--warning-color); font-weight: bold; margin-left: 4px;" title="Teiljahr: Nur ${Math.ceil(elapsedDays)} Tage vorhanden (eingeschränkte Aussagekraft für Kapazitätsszenarien)">⚠️ (Teiljahr)</span>`;
            button.title = `${ds.name} (Teiljahr: Nur ${Math.ceil(elapsedDays)} Tage vorhanden)`;
        } else {
            nameSpan.textContent = ds.name;
            button.title = ds.name;
        }

        // Inline rename pencil button
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-edit-dataset-name';
        editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
        editBtn.title = "Lastgang umbenennen";
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent toggling the checkbox select
            
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.className = 'btn-dataset-edit-input';
            editInput.value = ds.name;
            
            // Stop click propagation on input field so clicking inside it doesn't trigger the checkbox select
            editInput.addEventListener('click', (evt) => evt.stopPropagation());
            editInput.addEventListener('mousedown', (evt) => evt.stopPropagation());
            
            const saveName = () => {
                const val = editInput.value.trim();
                if (val && val !== ds.name) {
                    ds.name = val;
                    // Redraw checkboxes to update names, also updates editor and dashboard
                    renderDatasetCheckboxes(true);
                    updateDashboard();
                    showToast("Name erfolgreich aktualisiert!", "success");
                } else {
                    // Fallback to nameSpan
                    editInput.replaceWith(nameSpan);
                    editBtn.style.display = 'flex';
                }
            };
            
            editInput.addEventListener('blur', saveName);
            editInput.addEventListener('keydown', (evt) => {
                evt.stopPropagation();
                if (evt.key === 'Enter') {
                    saveName();
                } else if (evt.key === 'Escape') {
                    editInput.replaceWith(nameSpan);
                    editBtn.style.display = 'flex';
                }
            });
            
            nameSpan.replaceWith(editInput);
            editBtn.style.display = 'none'; // Temporarily hide pencil icon during editing
            editInput.focus();
            editInput.select();
        });

        button.appendChild(input);
        button.appendChild(indicator);
        button.appendChild(nameSpan);
        button.appendChild(editBtn);
        
        button.addEventListener('click', () => {
            const isProfileTab = document.querySelector('.tab-btn[data-target="tab-tagesprofil"]')?.classList.contains('active');
            const isEditorTab = document.querySelector('.tab-btn[data-target="tab-editor"]')?.classList.contains('active');
            const activeTab = document.querySelector('.tab-btn.active');
            const isAgnesTab = activeTab && activeTab.dataset.target && activeTab.dataset.target.startsWith('tab-agnes');
            const compareMode = isProfileTab ? (document.getElementById('select-profile-compare-mode')?.value || 'datasets') : 'datasets';

            if (isEditorTab || compareMode !== 'datasets') {
                if (input.checked) {
                    if (isEditorTab) {
                        showToast('Im Daten-Editor kann nur ein Lastgang zurzeit bearbeitet werden.', 'warning');
                    } else {
                        showToast('Für Quartals- und Wochentagsvergleiche muss genau ein Lastgang ausgewählt sein.', 'warning');
                    }
                    return;
                }

                // Keep only this button active
                container.querySelectorAll('.btn-dataset-select').forEach(btn => {
                    const cb = btn.querySelector('input[type="checkbox"]');
                    if (cb) {
                        cb.checked = (cb === input);
                        btn.classList.toggle('active', cb.checked);
                    }
                });
                activeDatasetIds = [idx];
                rawData = allDatasets[idx].data;
                
                updateDashboard();
                return;
            }

            // In datasets mode (multi-select)
            const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
            const activeCheckboxCount = checkboxes.filter(cb => cb.checked).length;
            
            // Try to toggle
            const targetState = !input.checked;
            
            if (!targetState && activeCheckboxCount === 1) {
                showToast("Es muss mindestens ein Lastgang ausgewählt sein.", "warning");
                return;
            }
            
            if (targetState && activeCheckboxCount >= 16) {
                showToast("Es können maximal 16 Lastgänge gleichzeitig verglichen werden.", "warning");
                return;
            }
            
            input.checked = targetState;
            button.classList.toggle('active', input.checked);
            
            // Recompute active ids
            let active = [];
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    active.push(parseInt(cb.value, 10));
                }
            });
            
            const enteringComparison = active.length > 1 && activeDatasetIds.length <= 1;
            activeDatasetIds = active;

            if (enteringComparison) {
                const showMax = document.getElementById('chk-show-max');
                const showMin = document.getElementById('chk-show-min');
                const hadRangeLines = showMax?.checked || showMin?.checked;
                if (showMax) showMax.checked = false;
                if (showMin) showMin.checked = false;
                if (hadRangeLines) {
                    showToast('Vergleichsansicht: Zur besseren Lesbarkeit werden zunächst nur Durchschnittswerte angezeigt.', 'info');
                }
            }
            
            if (activeDatasetIds.length > 0) {
                rawData = allDatasets[activeDatasetIds[0]].data;
            }

            if (isAgnesTab) {
                const selectAgnesDs = document.getElementById('select-agnes-dataset');
                if (selectAgnesDs && targetState) {
                    selectAgnesDs.value = idx;
                }
                if (typeof adjustDateRangeForAgnes === 'function') {
                    adjustDateRangeForAgnes();
                }
            }
            updateDashboard();
        });

        container.appendChild(button);
    });

    if (allDatasets.length > 0 && !preserveChecked) {
        rawData = allDatasets[0].data;
    }
    
    if (typeof populateEditorDropdown === 'function') {
        populateEditorDropdown();
    }
}

function enforceSingleDatasetForProfileComparison() {
    if (activeDatasetIds.length <= 1) return;

    const selectedId = activeDatasetIds[0];
    activeDatasetIds = [selectedId];
    rawData = allDatasets[selectedId].data;

    document.querySelectorAll('#dataset-checkboxes-container .btn-dataset-select').forEach(btn => {
        const cb = btn.querySelector('input[type="checkbox"]');
        if (cb) {
            cb.checked = parseInt(cb.value, 10) === selectedId;
            btn.classList.toggle('active', cb.checked);
        }
    });

    showToast('Für diesen Vergleich wurde auf einen Lastgang umgestellt.', 'info');
}

// --- Event Listeners ---
function setupEventListeners() {
    // AgNes Mode Switcher listeners
    const btnAgnesSingle = document.getElementById('btn-agnes-mode-single');
    const btnAgnesMulti = document.getElementById('btn-agnes-mode-multi');

    if (btnAgnesSingle && btnAgnesMulti) {
        const switchAgnesMode = (mode) => {
            const selectAgnesDs = document.getElementById('select-agnes-dataset');
            const currentSelId = selectAgnesDs ? parseInt(selectAgnesDs.value, 10) : activeDatasetIds[0];
            const targetDataset = allDatasets[currentSelId] || allDatasets[activeDatasetIds[0]];

            if (mode === 'multi') {
                let uniqueYearsCount = 0;
                if (targetDataset && targetDataset.data) {
                    const years = new Set();
                    targetDataset.data.forEach(d => {
                        if (d.dateObj) years.add(d.dateObj.getFullYear());
                    });
                    uniqueYearsCount = years.size;
                }
                if (uniqueYearsCount < 2) {
                    showToast("Der ausgewählte Lastgang muss Daten für mindestens 2 Kalenderjahre enthalten für eine Mehrjahresanalyse.", "warning");
                    return;
                }
            }

            currentAgnesMode = mode;
            btnAgnesSingle.classList.toggle('active', mode === 'single');
            btnAgnesMulti.classList.toggle('active', mode === 'multi');

            if (typeof adjustDateRangeForAgnes === 'function') {
                adjustDateRangeForAgnes();
            }
            updateDashboard();
        };
        btnAgnesSingle.addEventListener('click', () => switchAgnesMode('single'));
        btnAgnesMulti.addEventListener('click', () => switchAgnesMode('multi'));
    }

    // Theme Toggle
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            isDarkMode = !isDarkMode;
            if (isDarkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            updateThemeIcon();
            
            if (chartTimeline) chartTimeline.dispose();
            if (chartDailyProfile) chartDailyProfile.dispose();
            initCharts();
            
            if (screens.dashboard && !screens.dashboard.classList.contains('hidden')) {
                // Re-render checkboxes to update indicators to the new theme's colors
                renderDatasetCheckboxes(true);
                updateDashboard();
            }
        });
    }

    // Global prevention of browser default file opening on drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
        document.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // Drag & Drop for Upload Screen & Drop Zone
    const uploadScreen = document.getElementById('upload-screen');
    
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                handleFiles(e.dataTransfer.files);
            }
        });

        dropZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    if (uploadScreen) {
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadScreen.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dropZone) dropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadScreen.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dropZone) dropZone.classList.remove('dragover');
            }, false);
        });

        uploadScreen.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dropZone) dropZone.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                handleFiles(e.dataTransfer.files);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFiles(e.target.files);
            }
        });
    }

    // Peaks Configuration Changes
    const selectPeaksLimit = document.getElementById('select-peaks-limit');
    const selectPeaksDistance = document.getElementById('select-peaks-distance');
    if (selectPeaksLimit) {
        selectPeaksLimit.addEventListener('change', () => {
            const limitText = selectPeaksLimit.options[selectPeaksLimit.selectedIndex].text;
            showToast(`Anzahl der Spitzenlasten geändert auf: ${limitText}`, "info");
            updateDashboard();
        });
    }
    if (selectPeaksDistance) {
        selectPeaksDistance.addEventListener('change', () => {
            const distText = selectPeaksDistance.options[selectPeaksDistance.selectedIndex].text;
            showToast(`Mindestabstand geändert auf: ${distText}`, "info");
            updateDashboard();
        });
    }
    // Pivot Table Controls
    const selectPivotView = document.getElementById('select-pivot-view');
    const selectPivotInterval = document.getElementById('select-pivot-interval');
    const selectPivotMode = document.getElementById('select-pivot-mode');
    const wrapperPivotInterval = document.getElementById('wrapper-pivot-interval');
    const wrapperPivotMode = document.getElementById('wrapper-pivot-mode');

    const updatePivotControlsVisibility = () => {
        if (!selectPivotView) return;
        const view = selectPivotView.value;
        if (view === 'timeline') {
            if (wrapperPivotInterval) wrapperPivotInterval.style.display = 'flex';
            if (wrapperPivotMode) wrapperPivotMode.style.display = 'flex';
            if (selectPivotMode) {
                Array.from(selectPivotMode.options).forEach(opt => {
                    opt.style.display = (opt.value === 'performance' || opt.value === 'tariffs') ? 'block' : 'none';
                });
                if (selectPivotMode.value !== 'performance' && selectPivotMode.value !== 'tariffs') {
                    selectPivotMode.value = 'performance';
                }
            }
        } else if (view === 'matrix') {
            if (wrapperPivotInterval) wrapperPivotInterval.style.display = 'none';
            if (wrapperPivotMode) wrapperPivotMode.style.display = 'flex';
            if (selectPivotMode) {
                Array.from(selectPivotMode.options).forEach(opt => {
                    opt.style.display = (opt.value === 'pivot_peak' || opt.value === 'pivot_energy') ? 'block' : 'none';
                });
                if (selectPivotMode.value !== 'pivot_peak' && selectPivotMode.value !== 'pivot_energy') {
                    selectPivotMode.value = 'pivot_peak';
                }
            }
        } else if (view === 'datasets') {
            if (wrapperPivotInterval) wrapperPivotInterval.style.display = 'none';
            if (wrapperPivotMode) wrapperPivotMode.style.display = 'none';
        }
    };

    if (selectPivotView) {
        selectPivotView.addEventListener('change', () => {
            updatePivotControlsVisibility();
            updateDashboard();
        });
        updatePivotControlsVisibility();
    }
    if (selectPivotInterval) {
        selectPivotInterval.addEventListener('change', () => {
            updateDashboard();
        });
    }
    if (selectPivotMode) {
        selectPivotMode.addEventListener('change', () => {
            updateDashboard();
        });
    }
    const selectStatsDs = document.getElementById('select-stats-dataset');
    if (selectStatsDs) {
        selectStatsDs.addEventListener('change', () => {
            updateDashboard();
        });
    }

    // Collapsible Gap Log Toggle
    const btnToggleGapLog = document.getElementById('btn-toggle-gap-log');
    const gapLogWrapper = document.getElementById('collapsible-gap-log-wrapper');
    const gapLogToggleIcon = document.getElementById('gap-log-toggle-icon');
    const gapLogToggleText = document.getElementById('gap-log-toggle-text');

    if (btnToggleGapLog && gapLogWrapper) {
        btnToggleGapLog.addEventListener('click', () => {
            const isHidden = gapLogWrapper.style.display === 'none' || getComputedStyle(gapLogWrapper).display === 'none';
            if (isHidden) {
                gapLogWrapper.style.display = 'block';
                if (gapLogToggleIcon) gapLogToggleIcon.textContent = '▲';
                if (gapLogToggleText) gapLogToggleText.textContent = 'Lückenprotokoll verbergen';
            } else {
                gapLogWrapper.style.display = 'none';
                if (gapLogToggleIcon) gapLogToggleIcon.textContent = '▼';
                if (gapLogToggleText) gapLogToggleText.textContent = 'Lückenprotokoll anzeigen';
            }
        });
    }

    // Header Menu Dropdown Toggle
    const btnHeaderMenuToggle = document.getElementById('btn-header-menu-toggle');
    const headerMenuDropdown = document.getElementById('header-menu-dropdown');

    if (btnHeaderMenuToggle && headerMenuDropdown) {
        btnHeaderMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            headerMenuDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!headerMenuDropdown.contains(e.target) && !btnHeaderMenuToggle.contains(e.target)) {
                headerMenuDropdown.classList.add('hidden');
            }
        });
    }

    // Section Headers Collapsible Toggles & Schnellnavigation for Statistik Tab
    const statsSectionHeaders = document.querySelectorAll('.stats-section-header');
    statsSectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sectionId = header.dataset.toggleSection;
            const sectionEl = document.getElementById(sectionId);
            if (!sectionEl) return;
            const bodyEl = sectionEl.querySelector('.stats-section-body');
            const chevronEl = header.querySelector('.stats-section-chevron');
            if (!bodyEl) return;

            const isCollapsed = bodyEl.style.display === 'none' || getComputedStyle(bodyEl).display === 'none';
            if (isCollapsed) {
                bodyEl.style.display = 'block';
                if (chevronEl) chevronEl.textContent = '▼';
                updateDashboard();
            } else {
                bodyEl.style.display = 'none';
                if (chevronEl) chevronEl.textContent = '▶';
            }
        });
    });

    const statsNavBtns = document.querySelectorAll('.stats-nav-btn');
    statsNavBtns.forEach(navBtn => {
        navBtn.addEventListener('click', () => {
            const targetSectionId = navBtn.dataset.statsSection;
            const targetSection = document.getElementById(targetSectionId);
            if (!targetSection) return;

            // Highlight quicknav button
            statsNavBtns.forEach(b => b.classList.remove('active'));
            navBtn.classList.add('active');

            // Expand body if collapsed
            const bodyEl = targetSection.querySelector('.stats-section-body');
            const chevronEl = targetSection.querySelector('.stats-section-chevron');
            if (bodyEl) {
                bodyEl.style.display = 'block';
                if (chevronEl) chevronEl.textContent = '▼';
            }

            updateDashboard();

            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const btnExportPivotCsv = document.getElementById('btn-export-pivot-csv');
    if (btnExportPivotCsv) {
        btnExportPivotCsv.addEventListener('click', () => {
            exportPivotCSV();
        });
    }
    // New File
    if (btnNewFile) {
        btnNewFile.addEventListener('click', () => {
            if (screens.dashboard) screens.dashboard.classList.add('hidden');
            if (screens.upload) screens.upload.classList.remove('hidden');
            rawData = [];
            allDatasets = [];
            activeDatasetIds = [0];
            cachedAggregations = {};
            if (fileInput) fileInput.value = '';
        });
    }

    // Tabs navigation with dynamic sidebar content management (Priority 3 - VDE / HT / NT Redesign)
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetEl = document.getElementById(btn.dataset.target);
            if (targetEl) targetEl.classList.add('active');

            const targetTabId = btn.dataset.target;
            if (targetTabId === 'tab-editor') {
                loadTableValuesToEditor();
            }
            
            // Toggle Dynamic Sidebar Panels
            const verlaufControls = document.getElementById('sidebar-verlauf-controls');
            const profilControls = document.getElementById('sidebar-profil-controls');
            const agnesControls = document.getElementById('sidebar-agnes-controls');
            const tariffSection = document.getElementById('tariff-section');
            
            const unitSection = document.getElementById('display-unit-section');
            if (verlaufControls && profilControls) {
                if (targetTabId === 'tab-lastgang') {
                    verlaufControls.classList.remove('hidden');
                    profilControls.classList.add('hidden');
                    if (agnesControls) agnesControls.classList.add('hidden');
                    if (tariffSection) tariffSection.classList.add('hidden');
                    if (unitSection) unitSection.classList.remove('hidden');
                } else if (targetTabId === 'tab-tagesprofil') {
                    verlaufControls.classList.add('hidden');
                    profilControls.classList.remove('hidden');
                    if (agnesControls) agnesControls.classList.add('hidden');
                    if (tariffSection) tariffSection.classList.remove('hidden');
                    if (unitSection) unitSection.classList.remove('hidden');
                    
                    const compareMode = document.getElementById('select-profile-compare-mode')?.value || 'datasets';
                    if (compareMode !== 'datasets') {
                        enforceSingleDatasetForProfileComparison();
                    }
                } else if (targetTabId === 'tab-statistik') {
                    verlaufControls.classList.add('hidden');
                    profilControls.classList.add('hidden');
                    if (agnesControls) agnesControls.classList.add('hidden');
                    if (tariffSection) tariffSection.classList.remove('hidden');
                    if (unitSection) unitSection.classList.remove('hidden');
                } else if (targetTabId && targetTabId.startsWith('tab-agnes')) {
                    verlaufControls.classList.add('hidden');
                    profilControls.classList.add('hidden');
                    if (agnesControls) agnesControls.classList.remove('hidden');
                    if (tariffSection) tariffSection.classList.add('hidden');
                    if (unitSection) unitSection.classList.add('hidden');
                    
                    // Force kW unit mode
                    if (displayUnit !== 'kw') {
                        displayUnit = 'kw';
                        document.querySelectorAll('.btn-unit-toggle').forEach(b => {
                            b.classList.toggle('active', b.dataset.unit === 'kw');
                        });
                        updateMetricButtonsVisibility();
                        cachedAggregations = {};
                    }

                    if (activeDatasetIds.length === 0 && allDatasets && allDatasets.length > 0) {
                        activeDatasetIds = [0];
                        if (typeof renderDatasetCheckboxes === 'function') {
                            renderDatasetCheckboxes(true);
                        }
                    }
                    
                    if (typeof adjustDateRangeForAgnes === 'function') {
                        adjustDateRangeForAgnes();
                    }
                    updateDashboard();
                } else {
                    verlaufControls.classList.add('hidden');
                    profilControls.classList.add('hidden');
                    if (agnesControls) agnesControls.classList.add('hidden');
                    if (tariffSection) tariffSection.classList.add('hidden');
                    if (unitSection) unitSection.classList.remove('hidden');
                }
            }

            // Enable selectAggregation only for the timeline chart tab
            if (selectAggregation) {
                if (targetTabId === 'tab-lastgang') {
                    if (previousTimelineAggregation) {
                        selectAggregation.value = previousTimelineAggregation;
                    }
                    selectAggregation.disabled = false;
                    selectAggregation.title = "Aggregationsstufe wählen";
                } else {
                    if (selectAggregation.value !== '15m') {
                        previousTimelineAggregation = selectAggregation.value;
                    }
                    selectAggregation.value = '15m'; // Reset display to 15m since other views use raw resolution
                    selectAggregation.disabled = true;
                    selectAggregation.title = "Anderer Tab aktiv: Berechnungen laufen auf 15-Minuten-Rohdatenauflösung";
                }
            }
            
            setTimeout(() => {
                updateDashboard();
                if (chartTimeline) chartTimeline.resize();
                if (chartDailyProfile) chartDailyProfile.resize();
                if (typeof chartAgnesDuration !== 'undefined' && chartAgnesDuration) chartAgnesDuration.resize();
                if (typeof chartAgnesCost !== 'undefined' && chartAgnesCost) chartAgnesCost.resize();
            }, 10);
        });
    });

    // Module Sidebar Navigation
    const moduleBtns = document.querySelectorAll('.module-btn');
    const basisTabsContainer = document.querySelector('.basis-tabs');
    const agnesTabsContainer = document.querySelector('.agnes-tabs');
    let lastActiveBasisTabId = 'tab-lastgang';

    // Track last active basis tab when clicking on top header tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (target && !target.startsWith('tab-agnes')) {
                lastActiveBasisTabId = target;
            }
        });
    });

    moduleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            moduleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const moduleName = btn.dataset.module;
            if (moduleName === 'basis') {
                if (basisTabsContainer) basisTabsContainer.style.display = '';
                if (agnesTabsContainer) agnesTabsContainer.style.display = 'none';
                // Programmatically activate last active basis tab button
                const targetBtn = document.querySelector(`.tab-btn[data-target="${lastActiveBasisTabId}"]`);
                if (targetBtn) targetBtn.click();
            } else if (moduleName === 'agnes') {
                if (basisTabsContainer) basisTabsContainer.style.display = 'none';
                if (agnesTabsContainer) agnesTabsContainer.style.display = '';
                // Programmatically activate default agnes tab button (Optimierung & Kurven)
                const targetBtn = document.querySelector('.tab-btn[data-target="tab-agnes-charts"]');
                if (targetBtn) targetBtn.click();
            }

            // Force resize charts after tab/module change
            setTimeout(() => {
                if (chartTimeline) chartTimeline.resize();
                if (chartDailyProfile) chartDailyProfile.resize();
                if (typeof chartAgnesDuration !== 'undefined' && chartAgnesDuration) chartAgnesDuration.resize();
                if (typeof chartAgnesCost !== 'undefined' && chartAgnesCost) chartAgnesCost.resize();
            }, 50);
        });
    });


    if (selectAggregation) {
        selectAggregation.addEventListener('change', (e) => {
            currentAggregation = e.target.value;
            isManualAggregation = true;
            updateDashboard();
        });
    }

    const updateRange = () => {
        if (!inputDateStart || !inputDateEnd) return;
        
        const start = parseLocalDate(inputDateStart.value);
        const end = parseLocalDate(inputDateEnd.value);
        if (start && end && start <= end) {
            globalDateRange.start = start;
            globalDateRange.end = new Date(end.getTime() + 86400000 - 1); 
            updateDashboard();
        }
    };

    if (inputDateStart) {
        inputDateStart.addEventListener('change', () => {
            isManualAggregation = false;
            updateRange();
            document.querySelectorAll('.btn-zoom').forEach(b => b.classList.remove('active'));
        });
    }
    
    if (inputDateEnd) {
        inputDateEnd.addEventListener('change', () => {
            isManualAggregation = false;
            updateRange();
            document.querySelectorAll('.btn-zoom').forEach(b => b.classList.remove('active'));
        });
    }

    // Bind event handlers for the new dynamic profile & custom NT controls (Priority 3)
    const selectCompareMode = document.getElementById('select-profile-compare-mode');
    if (selectCompareMode) {
        selectCompareMode.addEventListener('change', (e) => {
            const mode = e.target.value;
            
            // Highlight the correct compare mode button
            document.querySelectorAll('.btn-comp-mode').forEach(b => {
                b.classList.toggle('active', b.dataset.compareMode === mode);
            });
            
            // Sync layout buttons (single vs multi active states)
            syncProfileButtonLayout(mode);
            syncProfileComparisonButtons(mode);
            
            // Update visual highlights for comparison vs filter groups
            updateProfileFilterGroupHighlights(mode);
            
            if (mode !== 'datasets') {
                enforceSingleDatasetForProfileComparison();
            }
            updateDashboard();
        });
        
        // Dispatch event programmatically on load to sync layout with restored browser value
        selectCompareMode.dispatchEvent(new Event('change'));
    }

    const profilControlsArray = [
        'select-profile-days',
        'select-profile-quarter',
        'chk-profile-days-all',
        'chk-profile-days-workdays',
        'chk-profile-days-weekends',
        'chk-profile-q-all',
        'chk-profile-q1',
        'chk-profile-q2',
        'chk-profile-q3',
        'chk-profile-q4',
        'chk-show-nt-shading',
        'input-nt-start',
        'input-nt-end',
        'chk-st-active',
        'input-st-start',
        'input-st-end'
    ];
    profilControlsArray.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                // Special toggle logic for ST inputs container when active state changes
                if (id === 'chk-st-active') {
                    const stContainer = document.getElementById('st-time-inputs');
                    if (stContainer) {
                        stContainer.style.display = el.checked ? 'flex' : 'none';
                    }
                }
                syncProfileComparisonButtons();
                updateDashboard();
            });
        }
    });

    const agnesControlsArray = [
        'input-agnes-kp',
        'input-agnes-ap1',
        'input-agnes-ap2'
    ];
    agnesControlsArray.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => updateDashboard());
            el.addEventListener('input', () => updateDashboard());
        }
    });

    const minKwEl = document.getElementById('input-agnes-min-kw');
    if (minKwEl) {
        // Reactively update calculations during typing without overriding the user's text
        minKwEl.addEventListener('input', () => updateDashboard());
        
        // Sanitize, round, and clamp the value inside the input field only when editing is committed (blur or enter)
        minKwEl.addEventListener('change', () => {
            if (!activeDatasetIds || activeDatasetIds.length === 0) return;
            const dataset = allDatasets[activeDatasetIds[0]];
            if (!dataset || !dataset.data) return;
            
            let pMaxClean = 0;
            const seenTsForPeak = new Set();
            dataset.data.forEach(d => {
                if (!Number.isFinite(d.kw) || d.kw < 0 || d.kw > 100000) return;
                if (Number.isFinite(d.timestamp)) {
                    if (seenTsForPeak.has(d.timestamp)) return;
                    seenTsForPeak.add(d.timestamp);
                }
                if (d.kw > pMaxClean) {
                    pMaxClean = d.kw;
                }
            });
            
            const minAllowedKw = Math.ceil(pMaxClean * 0.1);
            let val = parseFloat(minKwEl.value);
            if (isNaN(val)) {
                minKwEl.value = Math.round(pMaxClean * 0.2);
            } else {
                minKwEl.value = Math.max(Math.round(val), minAllowedKw);
            }
            updateDashboard();
        });
    }

    // Initialize ST inputs container visibility on startup (handles browser autocomplete)
    const chkStActive = document.getElementById('chk-st-active');
    const stContainer = document.getElementById('st-time-inputs');
    if (chkStActive && stContainer) {
        stContainer.style.display = chkStActive.checked ? 'flex' : 'none';
    }

    // Bind click event listeners for the comparison mode buttons (static layout)
    document.querySelectorAll('.btn-comp-mode').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.compareMode;
            const selectCompareMode = document.getElementById('select-profile-compare-mode');
            if (selectCompareMode) {
                selectCompareMode.value = mode;
                selectCompareMode.dispatchEvent(new Event('change'));
            }
        });
    });



    // Bind click event listeners for the Wochentage buttons (static layout)
    document.querySelectorAll('.btn-day-select').forEach(btn => {
        btn.addEventListener('click', () => {
            const compareMode = document.getElementById('select-profile-compare-mode')?.value || 'datasets';
            
            if (compareMode === 'days') {
                // Multi-select behavior
                const chk = document.getElementById(btn.dataset.chkId);
                if (chk) {
                    const active = Array.from(document.querySelectorAll('.btn-day-select.active'));
                    if (active.length === 1 && active[0] === btn) {
                        showToast("Es muss mindestens ein Wochentag ausgewählt bleiben.", "warning");
                        return;
                    }
                    chk.checked = !chk.checked;
                    btn.classList.toggle('active', chk.checked);
                    chk.dispatchEvent(new Event('change'));
                }
            } else {
                // Single-select behavior
                const val = btn.dataset.dayVal;
                const dropdown = document.getElementById('select-profile-days');
                if (dropdown) {
                    dropdown.value = val;
                    dropdown.dispatchEvent(new Event('change'));
                }
                document.querySelectorAll('.btn-day-select').forEach(b => {
                    b.classList.toggle('active', b === btn);
                });
            }
        });
    });

    // Bind click event listeners for the Quartale buttons (static layout)
    document.querySelectorAll('.btn-quarter-select').forEach(btn => {
        btn.addEventListener('click', () => {
            const compareMode = document.getElementById('select-profile-compare-mode')?.value || 'datasets';
            
            if (compareMode === 'quarters') {
                // Multi-select behavior
                const chk = document.getElementById(btn.dataset.chkId);
                if (chk) {
                    const active = Array.from(document.querySelectorAll('.btn-quarter-select.active'));
                    if (active.length === 1 && active[0] === btn) {
                        showToast("Es muss mindestens ein Quartal ausgewählt bleiben.", "warning");
                        return;
                    }
                    chk.checked = !chk.checked;
                    btn.classList.toggle('active', chk.checked);
                    chk.dispatchEvent(new Event('change'));
                }
            } else {
                // Single-select behavior
                const val = btn.dataset.qVal;
                const dropdown = document.getElementById('select-profile-quarter');
                if (dropdown) {
                    dropdown.value = val;
                    dropdown.dispatchEvent(new Event('change'));
                }
                document.querySelectorAll('.btn-quarter-select').forEach(b => {
                    b.classList.toggle('active', b === btn);
                });
            }
        });
    });

    // --- Navigation & Zoom Controls ---
    const updateInputsAndChart = (newStart, newEnd) => {
        if (!rawData || rawData.length === 0) return;
        const minDate = globalDateRange.validMin || rawData[0].dateObj;
        const maxDate = globalDateRange.validMax || rawData[rawData.length - 1].dateObj;

        if (newStart < minDate) newStart = new Date(minDate.getTime());
        if (newEnd > maxDate) newEnd = new Date(maxDate.getTime());
        if (newStart > newEnd) newStart = new Date(newEnd.getTime());

        if (inputDateStart) inputDateStart.value = getLocalDateString(newStart);
        if (inputDateEnd) inputDateEnd.value = getLocalDateString(newEnd);
        updateRange();
    };

    document.querySelectorAll('.btn-nav').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!rawData || rawData.length === 0) return;
            if (!inputDateStart || !inputDateEnd) return;
            
            let start = parseLocalDate(inputDateStart.value);
            let end = parseLocalDate(inputDateEnd.value);
            const type = btn.dataset.nav;
            
            let zoomMode = currentZoom;
            if (zoomMode === 'max') {
                zoomMode = 'month';
                currentZoom = 'month';
                updateNavTooltips();
            }

            const offset = (type.startsWith('prev')) ? -1 : 1;
            const isDouble = type.endsWith('double');

            if (zoomMode === 'day') {
                const days = isDouble ? 7 : 1;
                start.setDate(start.getDate() + offset * days);
                end.setDate(end.getDate() + offset * days);
            } else if (zoomMode === 'week') {
                const days = isDouble ? 28 : 7;
                start.setDate(start.getDate() + offset * days);
                end.setDate(end.getDate() + offset * days);
            } else if (zoomMode === 'month') {
                const months = isDouble ? 6 : 1;
                start.setMonth(start.getMonth() + offset * months);
                end.setMonth(end.getMonth() + offset * months);
            } else if (zoomMode === 'year') {
                if (isDouble) {
                    const minDate = globalDateRange.validMin || rawData[0].dateObj;
                    const maxDate = globalDateRange.validMax || rawData[rawData.length - 1].dateObj;
                    if (offset < 0) {
                        start = new Date(minDate.getTime());
                        end = new Date(start.getTime());
                        end.setFullYear(end.getFullYear() + 1);
                        end.setDate(end.getDate() - 1);
                    } else {
                        end = new Date(maxDate.getTime());
                        start = new Date(end.getTime());
                        start.setFullYear(start.getFullYear() - 1);
                        start.setDate(start.getDate() + 1);
                    }
                } else {
                    start.setFullYear(start.getFullYear() + offset);
                    end.setFullYear(end.getFullYear() + offset);
                }
            }

            isManualAggregation = false;
            updateInputsAndChart(start, end);
            document.querySelectorAll('.btn-zoom').forEach(b => b.classList.remove('active'));
        });
    });

    document.querySelectorAll('.btn-zoom').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-zoom').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (!rawData || rawData.length === 0) return;
            if (!inputDateStart) return;

            const minDate = globalDateRange.validMin || rawData[0].dateObj;
            const maxDate = globalDateRange.validMax || rawData[rawData.length - 1].dateObj;
            let start = parseLocalDate(inputDateStart.value);
            let end = new Date(start.getTime());
            const zoom = btn.dataset.zoom;
            currentZoom = zoom;
            updateNavTooltips();

            if (zoom === 'day') {
                end = new Date(start.getTime());
            } else if (zoom === 'week') {
                const day = start.getDay() || 7;
                start.setDate(start.getDate() - day + 1);
                end = new Date(start.getTime());
                end.setDate(end.getDate() + 6);
            } else if (zoom === 'month') {
                start = new Date(start.getFullYear(), start.getMonth(), 1);
                end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            } else if (zoom === 'year') {
                start = new Date(start.getFullYear(), 0, 1);
                end = new Date(start.getFullYear(), 11, 31);
            } else if (zoom === 'max') {
                const activeTab = document.querySelector('.tab-btn.active');
                const isAgnesTab = activeTab && activeTab.dataset.target && activeTab.dataset.target.startsWith('tab-agnes');
                if (isAgnesTab && typeof adjustDateRangeForAgnes === 'function') {
                    adjustDateRangeForAgnes();
                    isManualAggregation = false;
                    updateDashboard();
                    return;
                } else {
                    let minD = null;
                    let maxD = null;
                    const activeDatasets = (activeDatasetIds && activeDatasetIds.length > 0 ? activeDatasetIds : [0])
                        .map(idx => allDatasets[idx]).filter(Boolean);
                    activeDatasets.forEach(ds => {
                        if (ds.data && ds.data.length > 0) {
                            const dStart = ds.data[0].dateObj;
                            const dEnd = ds.data[ds.data.length - 1].dateObj;
                            if (!minD || (dStart && dStart < minD)) minD = dStart;
                            if (!maxD || (dEnd && dEnd > maxD)) maxD = dEnd;
                        }
                    });
                    if (!minD) {
                        minD = minDate;
                        maxD = maxDate;
                    }
                    start = new Date(minD.getFullYear(), minD.getMonth(), minD.getDate(), 0, 0, 0);
                    end = new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate(), 23, 59, 59);

                    if (!globalDateRange.validMin || start < globalDateRange.validMin) globalDateRange.validMin = start;
                    if (!globalDateRange.validMax || end > globalDateRange.validMax) globalDateRange.validMax = end;
                }
            }

            if (end > maxDate && zoom !== 'max') {
                if (zoom === 'year') {
                    start = new Date(maxDate.getFullYear(), 0, 1);
                    if (start < minDate) start = new Date(minDate.getTime());
                    end = new Date(maxDate.getTime());
                } else {
                    const diff = end.getTime() - start.getTime();
                    end = new Date(maxDate.getTime());
                    start = new Date(end.getTime() - diff);
                    if (start < minDate) start = new Date(minDate.getTime());
                }
            }

            isManualAggregation = false;
            updateInputsAndChart(start, end);
        });
    });

    // Synchronize initial active state for zoom buttons matching currentZoom
    document.querySelectorAll('.btn-zoom').forEach(b => {
        b.classList.toggle('active', b.dataset.zoom === currentZoom);
    });

    // Profile Dropdown filter event listeners (Classic Mode)
    const selectProfileDays = document.getElementById('select-profile-days');
    const selectProfileQuarter = document.getElementById('select-profile-quarter');
    
    if (selectProfileDays) {
        selectProfileDays.addEventListener('change', () => {
            if (activeDatasetIds.length > 0) {
                const activeFilteredDatasets = activeDatasetIds.map(dsId => ({
                    id: dsId,
                    name: allDatasets[dsId].name,
                    data: getFilteredData(dsId)
                }));
                renderDailyProfileChart(activeFilteredDatasets);
            }
        });
    }

    if (selectProfileQuarter) {
        selectProfileQuarter.addEventListener('change', () => {
            if (activeDatasetIds.length > 0) {
                const activeFilteredDatasets = activeDatasetIds.map(dsId => ({
                    id: dsId,
                    name: allDatasets[dsId].name,
                    data: getFilteredData(dsId)
                }));
                renderDailyProfileChart(activeFilteredDatasets);
            }
        });
    }

    const chkShowAvg = document.getElementById('chk-show-avg');
    const chkShowMax = document.getElementById('chk-show-max');
    const chkShowMin = document.getElementById('chk-show-min');
    
    const metricCheckboxes = [chkShowAvg, chkShowMax, chkShowMin];
    metricCheckboxes.forEach(chk => {
        if (chk) {
            chk.addEventListener('change', () => {
                if (!chkShowAvg.checked && !chkShowMax.checked && !chkShowMin.checked) {
                    chk.checked = true;
                }
                
                // Synchronize active states on buttons
                metricCheckboxes.forEach(c => {
                    if (c) {
                        const btn = document.querySelector(`.btn-metric-select[data-chk-id="${c.id}"]`);
                        if (btn) btn.classList.toggle('active', c.checked);
                    }
                });
                
                updateDashboard();
            });
        }
    });

    // Bind click event listeners for the metric buttons (Ø, max, min)
    document.querySelectorAll('.btn-metric-select').forEach(btn => {
        btn.addEventListener('click', () => {
            const chkId = btn.dataset.chkId;
            const chk = document.getElementById(chkId);
            if (chk) {
                chk.checked = !chk.checked;
                chk.dispatchEvent(new Event('change'));
            }
        });
    });

    // Bind click event listeners for the aggregation buttons (15m, 1h, 1d, 1w, 1M)
    document.querySelectorAll('.btn-agg-select').forEach(btn => {
        btn.addEventListener('click', () => {
            const agg = btn.dataset.agg;
            const selectAggregation = document.getElementById('aggregation-select');
            if (selectAggregation) {
                isManualAggregation = true; // User manually clicked, prevent auto-zoom overrides until zoom event
                selectAggregation.value = agg;
                selectAggregation.dispatchEvent(new Event('change'));
            }
            
            // Highlight button
            document.querySelectorAll('.btn-agg-select').forEach(b => {
                b.classList.toggle('active', b.dataset.agg === agg);
            });
        });
    });

    // Synchronize initial active state for aggregation buttons
    if (selectAggregation) {
        document.querySelectorAll('.btn-agg-select').forEach(b => {
            b.classList.toggle('active', b.dataset.agg === selectAggregation.value);
        });
    }

    // Sidebar Collapse/Expand Toggle
    const btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (btnSidebarToggle && sidebar) {
        btnSidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('expanded');
            const isExpanded = sidebar.classList.contains('expanded');
            btnSidebarToggle.title = isExpanded ? 'Seitenleiste lösen' : 'Seitenleiste fixieren';
            setTimeout(() => {
                if (chartTimeline) chartTimeline.resize();
                if (chartDailyProfile) chartDailyProfile.resize();
                if (typeof chartAgnesDuration !== 'undefined' && chartAgnesDuration) chartAgnesDuration.resize();
                if (typeof chartAgnesCost !== 'undefined' && chartAgnesCost) chartAgnesCost.resize();
            }, 320); // Wait for 300ms width transition to complete
        });
    }

    // Export Handlers (Timeline)
    const btnExportPng = document.getElementById('btn-export-png');
    if (btnExportPng) {
        btnExportPng.addEventListener('click', () => {
            if (!chartTimeline) return;
            const titleText = document.getElementById('timeline-chart-title')?.textContent || 'Leistungsverlauf';
            const rangeText = document.getElementById('timeline-range-info')?.textContent || '';
            const dsName = activeDatasetIds.length > 0 && allDatasets[activeDatasetIds[0]] ? allDatasets[activeDatasetIds[0]].name : '';
            const subtitleText = dsName ? `Lastgang: ${dsName} | Zeitraum: ${rangeText}` : rangeText;
            
            exportChartWithTitle(chartTimeline, titleText, subtitleText, `lastgang_diagramm_${new Date().toISOString().split('T')[0]}.png`);
            showToast("Verlaufs-Diagramm erfolgreich als PNG exportiert.", "success");
        });
    }

    const btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            if (activeDatasetIds.length === 0) {
                showToast("Keine Lastgänge ausgewählt.", "warning");
                return;
            }
            const dsId = activeDatasetIds[0];
            const ds = allDatasets[dsId];
            const data = getFilteredData(dsId);
            if (data.length === 0) {
                showToast("Keine Daten zum Exportieren vorhanden.", "warning");
                return;
            }
            const aggData = aggregateData(data, currentAggregation, dsId);
            
            let csvContent = `Datum;Zeitstempel;Durchschnitt (kW);Maximum (kW);Minimum (kW) - Exportiert von ZP: ${ds.name}\n`;
            aggData.forEach(d => {
                const dateStr = d.dateObj.toLocaleString('de-DE');
                const kw = d.kw !== null ? d.kw.toFixed(3).replace('.', ',') : '';
                const max = d.maxKw !== undefined && d.maxKw !== null ? d.maxKw.toFixed(3).replace('.', ',') : (d.kw !== null ? d.kw.toFixed(3).replace('.', ',') : '');
                const min = d.minKw !== undefined && d.minKw !== null ? d.minKw.toFixed(3).replace('.', ',') : (d.kw !== null ? d.kw.toFixed(3).replace('.', ',') : '');
                csvContent += `"${dateStr}";${d.timestamp};${kw};${max};${min}\n`;
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lastgang_daten_${ds.name.replace(/\s+/g, '_')}_${currentAggregation}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`Aggregierte Daten für ${ds.name} exportiert.`, "success");
        });
    }

    // Export Handlers (Tagesprofile)
    const btnExportProfilePng = document.getElementById('btn-export-profile-png');
    if (btnExportProfilePng) {
        btnExportProfilePng.addEventListener('click', () => {
            if (!chartDailyProfile) return;
            const titleText = document.getElementById('daily-profile-title')?.textContent || 'Überlagerte Tagesprofile';
            const dsName = activeDatasetIds.length > 0 && allDatasets[activeDatasetIds[0]] ? allDatasets[activeDatasetIds[0]].name : '';
            const rangeText = (typeof globalDateRange !== 'undefined' && globalDateRange.start && globalDateRange.end)
                ? `${getLocalDateString(globalDateRange.start)} bis ${getLocalDateString(globalDateRange.end)}` : '';
            const subtitleText = dsName ? `Lastgang: ${dsName} | Zeitraum: ${rangeText}` : rangeText;

            exportChartWithTitle(chartDailyProfile, titleText, subtitleText, `tagesprofil_diagramm_${new Date().toISOString().split('T')[0]}.png`);
            showToast("Tagesprofil-Diagramm erfolgreich als PNG exportiert.", "success");
        });
    }

    const btnExportProfileCsv = document.getElementById('btn-export-profile-csv');
    if (btnExportProfileCsv) {
        btnExportProfileCsv.addEventListener('click', () => {
            if (activeDatasetIds.length === 0) return;
            
            const activeFiltered = activeDatasetIds.map(dsId => ({
                id: dsId,
                name: allDatasets[dsId].name,
                data: getFilteredData(dsId)
            }));
            
            const compareMode = document.getElementById('select-profile-compare-mode')?.value || 'datasets';
            const showNtShading = document.getElementById('chk-show-nt-shading')?.checked;

            const isHoliday = (d) => window.isHoliday(d.dateObj);
            const isWeekend = (d) => {
                const day = d.dateObj.getDay();
                return day === 0 || day === 6;
            };
            const isWorkday = (d) => {
                const day = d.dateObj.getDay();
                return day >= 1 && day <= 5 && !isHoliday(d);
            };

            let csvContent = "";

            if (compareMode === 'datasets') {
                const daysFilter = document.getElementById('select-profile-days')?.value || 'all';
                const quarterFilter = document.getElementById('select-profile-quarter')?.value || 'all';

                let matchesDay = (d) => true;
                if (daysFilter === 'workdays') matchesDay = isWorkday;
                else if (daysFilter === 'weekends') matchesDay = (d) => isWeekend(d) || isHoliday(d);

                let matchesQuarter = (d) => true;
                if (quarterFilter === 'q1') matchesQuarter = (d) => d.dateObj.getMonth() >= 0 && d.dateObj.getMonth() <= 2;
                else if (quarterFilter === 'q2') matchesQuarter = (d) => d.dateObj.getMonth() >= 3 && d.dateObj.getMonth() <= 5;
                else if (quarterFilter === 'q3') matchesQuarter = (d) => d.dateObj.getMonth() >= 6 && d.dateObj.getMonth() <= 8;
                else if (quarterFilter === 'q4') matchesQuarter = (d) => d.dateObj.getMonth() >= 9 && d.dateObj.getMonth() <= 11;

                const finalFilterFn = (d) => matchesDay(d) && matchesQuarter(d);

                csvContent = "Uhrzeit;Zaehlpunkt;Durchschnitt (kW);Minimum (kW);Maximum (kW)\n";
                activeFiltered.forEach(ds => {
                    const prof = calculateSingleDatasetProfiles(ds.data, finalFilterFn);
                    for (let i = 0; i < 96; i++) {
                        const h = Math.floor(i / 4);
                        const m = (i % 4) * 15;
                        const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                        csvContent += `"${timeStr}";"${ds.name}";${prof[i].avg.toFixed(2).replace('.', ',')};${prof[i].min.toFixed(2).replace('.', ',')};${prof[i].max.toFixed(2).replace('.', ',')}\n`;
                    }
                });
            } else if (compareMode === 'quarters') {
                const ds = activeFiltered[0];
                const daysFilter = document.getElementById('select-profile-days')?.value || 'all';
                let matchesDay = (d) => true;
                if (daysFilter === 'workdays') matchesDay = isWorkday;
                else if (daysFilter === 'weekends') matchesDay = (d) => isWeekend(d) || isHoliday(d);

                const quarters = [
                    { name: 'Gesamtzeitraum', filter: (d) => true, chkId: 'chk-profile-q-all' },
                    { name: 'Q1 (Jan-Mär)', filter: (d) => d.dateObj.getMonth() >= 0 && d.dateObj.getMonth() <= 2, chkId: 'chk-profile-q1' },
                    { name: 'Q2 (Apr-Jun)', filter: (d) => d.dateObj.getMonth() >= 3 && d.dateObj.getMonth() <= 5, chkId: 'chk-profile-q2' },
                    { name: 'Q3 (Jul-Sep)', filter: (d) => d.dateObj.getMonth() >= 6 && d.dateObj.getMonth() <= 8, chkId: 'chk-profile-q3' },
                    { name: 'Q4 (Okt-Dez)', filter: (d) => d.dateObj.getMonth() >= 9 && d.dateObj.getMonth() <= 11, chkId: 'chk-profile-q4' }
                ];

                const activeQuarters = quarters.filter(q => document.getElementById(q.chkId)?.checked);
                csvContent = `Uhrzeit;Lastgang;${activeQuarters.map(q => q.name + ' (kW)').join(';')}\n`;

                const profiles = activeQuarters.map(q => {
                    const finalFilterFn = (d) => matchesDay(d) && q.filter(d);
                    return calculateSingleDatasetProfiles(ds.data, finalFilterFn);
                });

                for (let i = 0; i < 96; i++) {
                    const h = Math.floor(i / 4);
                    const m = (i % 4) * 15;
                    const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                    const lineVals = profiles.map(p => p[i].avg.toFixed(2).replace('.', ','));
                    csvContent += `"${timeStr}";"${ds.name}";${lineVals.join(';')}\n`;
                }
            } else if (compareMode === 'days') {
                const ds = activeFiltered[0];
                const quarterFilter = document.getElementById('select-profile-quarter')?.value || 'all';

                let matchesQuarter = (d) => true;
                if (quarterFilter === 'q1') matchesQuarter = (d) => d.dateObj.getMonth() >= 0 && d.dateObj.getMonth() <= 2;
                else if (quarterFilter === 'q2') matchesQuarter = (d) => d.dateObj.getMonth() >= 3 && d.dateObj.getMonth() <= 5;
                else if (quarterFilter === 'q3') matchesQuarter = (d) => d.dateObj.getMonth() >= 6 && d.dateObj.getMonth() <= 8;
                else if (quarterFilter === 'q4') matchesQuarter = (d) => d.dateObj.getMonth() >= 9 && d.dateObj.getMonth() <= 11;

                const dayCategories = [
                    { name: 'Gesamtwoche', filter: (d) => true, chkId: 'chk-profile-days-all' },
                    { name: 'Werktage (Mo-Fr)', filter: isWorkday, chkId: 'chk-profile-days-workdays' },
                    { name: 'Wochenenden und Feiertage', filter: (d) => isWeekend(d) || isHoliday(d), chkId: 'chk-profile-days-weekends' }
                ];

                const activeCats = dayCategories.filter(cat => document.getElementById(cat.chkId)?.checked);
                csvContent = `Uhrzeit;Lastgang;${activeCats.map(cat => cat.name + ' (kW)').join(';')}\n`;

                const profiles = activeCats.map(cat => {
                    const finalFilterFn = (d) => matchesQuarter(d) && cat.filter(d);
                    return calculateSingleDatasetProfiles(ds.data, finalFilterFn);
                });

                for (let i = 0; i < 96; i++) {
                    const h = Math.floor(i / 4);
                    const m = (i % 4) * 15;
                    const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                    const lineVals = profiles.map(p => p[i].avg.toFixed(2).replace('.', ','));
                    csvContent += `"${timeStr}";"${ds.name}";${lineVals.join(';')}\n`;
                }
            }
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tagesprofile_daten_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Tagesprofil-Werte erfolgreich als CSV exportiert.", "success");
        });
    }

    // --- Data Editor Event Listeners ---

    // --- Start empty dataset ---
    const btnStartEmpty = document.getElementById('btn-start-empty');
    if (btnStartEmpty) {
        btnStartEmpty.addEventListener('click', () => {
            let emptyData = [];
            for (let i = 0; i < 96; i++) {
                const h = Math.floor(i / 4);
                const m = (i % 4) * 15;
                const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                const ts = new Date(2026, 0, 1, h, m);
                emptyData.push({
                    timestamp: ts.getTime(),
                    dateObj: ts,
                    dateStr: "01.01.2026",
                    timeStr: timeStr,
                    rawKw: null,
                    kw: null,
                    kvar: null,
                    hasData: false
                });
            }
            
            allDatasets = [{
                name: "Manueller Lastgang",
                data: emptyData,
                totalRowsCount: 0,
                invalidRowsCount: 0,
                importedUnit: "kw"
            }];
            
            currentDatasetId = 0;
            rawData = allDatasets[0].data;
            activeDatasetIds = [0];
            
            globalDateRange.validMin = emptyData[0].dateObj;
            globalDateRange.validMax = emptyData[emptyData.length - 1].dateObj;
            globalDateRange.start = emptyData[0].dateObj;
            globalDateRange.end = emptyData[emptyData.length - 1].dateObj;
            
            const inputDateStart = document.getElementById('date-start');
            const inputDateEnd = document.getElementById('date-end');
            if (inputDateStart && inputDateEnd) {
                inputDateStart.value = "2026-01-01";
                inputDateEnd.value = "2026-01-01";
            }
            
            if (typeof renderDatasetCheckboxes === 'function') {
                renderDatasetCheckboxes();
            }
            
            const scrUpload = document.getElementById('upload-screen');
            const scrDashboard = document.getElementById('dashboard-screen');
            if (scrUpload) scrUpload.classList.add('hidden');
            if (scrDashboard) scrDashboard.classList.remove('hidden');
            
            const editorTabBtn = document.querySelector('.tab-btn[data-target="tab-editor"]');
            if (editorTabBtn) editorTabBtn.click();
            
            showToast("Manueller Lastgang initialisiert! Kopiere deine Excel-Spalten hier hinein.", "success");
        });
    }

    // --- Global display unit toggle listener ---
    document.querySelectorAll('.btn-unit-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
            const selectedUnit = this.dataset.unit;
            if (displayUnit === selectedUnit) return;
            
            displayUnit = selectedUnit;
            document.querySelectorAll('.btn-unit-toggle').forEach(b => {
                b.classList.toggle('active', b.dataset.unit === selectedUnit);
            });
            
            updateMetricButtonsVisibility();
            cachedAggregations = {};
            updateDashboard();
            loadTableValuesToEditor();
            showToast(`Darstellungseinheit auf ${displayUnit.toUpperCase()} gewechselt.`, "success");
        });
    });

    // --- CSV Import Unit Modal Button click handlers ---
    const btnModalConfirm = document.getElementById('btn-modal-confirm');
    if (btnModalConfirm) {
        btnModalConfirm.addEventListener('click', () => {
            const selectedUnit = document.getElementById('modal-import-unit')?.value || 'kw';
            const modal = document.getElementById('unit-modal');
            if (modal) modal.classList.add('hidden');
            
            if (typeof tempParsedDatasets !== 'undefined' && tempParsedDatasets.length > 0) {
                finalizeImport(tempParsedDatasets, selectedUnit);
                tempParsedDatasets = [];
            }
        });
    }

    const btnModalCancel = document.getElementById('btn-modal-cancel');
    if (btnModalCancel) {
        btnModalCancel.addEventListener('click', () => {
            const modal = document.getElementById('unit-modal');
            if (modal) modal.classList.add('hidden');
            tempParsedDatasets = [];
            resetUpload();
        });
    }

    const btnPrevPage = document.getElementById('editor-table-prev');
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (editorTablePage > 0) {
                editorTablePage--;
                loadTableValuesToEditor();
            }
        });
    }

    const btnNextPage = document.getElementById('editor-table-next');
    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            if ((editorTablePage + 1) * editorGridPageSize < allTimestampsInSelectedRange.length) {
                editorTablePage++;
                loadTableValuesToEditor();
            }
        });
    }

    updateMetricButtonsVisibility();
    setupSpreadsheetEvents();
}

function updateMetricButtonsVisibility() {
    const isKwh = displayUnit === 'kwh';
    const btnMax = document.querySelector('.btn-metric-select[data-chk-id="chk-show-max"]');
    const btnMin = document.querySelector('.btn-metric-select[data-chk-id="chk-show-min"]');
    
    if (btnMax && btnMin) {
        if (isKwh) {
            btnMax.style.display = 'none';
            btnMin.style.display = 'none';
            // Uncheck them
            const chkMax = document.getElementById('chk-show-max');
            const chkMin = document.getElementById('chk-show-min');
            if (chkMax) chkMax.checked = false;
            if (chkMin) chkMin.checked = false;
            
            // Activate the Ø button
            const chkAvg = document.getElementById('chk-show-avg');
            if (chkAvg) chkAvg.checked = true;
            
            // Sync button classes
            document.querySelectorAll('.btn-metric-select').forEach(b => {
                const cid = b.dataset.chkId;
                const c = document.getElementById(cid);
                if (b && c) b.classList.toggle('active', c.checked);
            });
        } else {
            btnMax.style.display = '';
            btnMin.style.display = '';
        }
    }
}

// --- Data Processing & Updating ---
function getFilteredData(datasetId = 0) {
    const ds = allDatasets[datasetId];
    if (!ds || !ds.data || ds.data.length === 0) return [];
    
    const startMs = globalDateRange.start ? globalDateRange.start.getTime() : 0;
    const endMs = globalDateRange.end ? globalDateRange.end.getTime() : Infinity;
    const data = ds.data;
    
    // Binary search lower bound (first index >= startMs)
    let low = 0, high = data.length - 1;
    let startIdx = data.length;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (data[mid].timestamp >= startMs) {
            startIdx = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    
    // Binary search upper bound (last index <= endMs)
    low = 0; high = data.length - 1;
    let endIdx = -1;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (data[mid].timestamp <= endMs) {
            endIdx = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    
    if (startIdx > endIdx || startIdx >= data.length || endIdx < 0) return [];
    return data.slice(startIdx, endIdx + 1);
}

function aggregateData(data, aggLevel, datasetId = 0) {
    if (!data || data.length === 0) return [];

    const startMs = data[0]?.timestamp || 0;
    const endMs = data[data.length - 1]?.timestamp || 0;
    const ds = allDatasets[datasetId];
    const dsVersion = ds ? (ds.version || 0) : 0;
    const cacheKey = `${datasetId}_${aggLevel}_${data.length}_${startMs}_${endMs}_v${dsVersion}`;

    if (cachedAggregations[cacheKey]) {
        return cachedAggregations[cacheKey];
    }

    if (aggLevel === '15m') {
        cachedAggregations[cacheKey] = data;
        return data;
    }

    const aggregated = [];
    let currentKey = null;
    let currentBucket = null;

    let lastTs = null;
    data.forEach((d, idx) => {
        let intervalHours = 0;
        if (Number.isFinite(d.intervalHours) && d.intervalHours > 0 && d.intervalHours <= 24) {
            intervalHours = d.intervalHours;
        } else if (idx === 0) {
            intervalHours = 0.25;
        } else if (lastTs !== null) {
            const diffMs = d.timestamp - lastTs;
            // Only use the diff if it is plausible (e.g. less than 1 hour, to avoid bridging large gaps)
            if (diffMs > 0 && diffMs <= 60 * 60 * 1000) {
                intervalHours = diffMs / 3600000;
            }
        }
        lastTs = d.timestamp;

        let key;
        const ts = d.dateObj instanceof Date ? d.dateObj : new Date(d.timestamp);
        if (!Number.isFinite(ts.getTime())) return;
        
        switch (aggLevel) {
            case '1h':
                key = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}-${ts.getHours()}`;
                break;
            case '1d':
                key = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}`;
                break;
            case '1w':
                const day = ts.getDay() || 7; 
                const firstDay = new Date(ts);
                firstDay.setHours(0,0,0,0);
                firstDay.setDate(ts.getDate() - day + 1);
                key = firstDay.getTime();
                break;
            case '1M':
                key = `${ts.getFullYear()}-${ts.getMonth()}`;
                break;
        }

        const intervalMeasurement = intervalHours > 0 ? { ...d, intervalHours } : d;
        const hasKw = Number.isFinite(d.kw) && d.kw >= 0 && d.kw <= 100000;
        const intervalKwh = typeof getMeasurementEnergyKwh === 'function'
            ? (getMeasurementEnergyKwh(intervalMeasurement) || 0)
            : (hasKw ? d.kw * intervalHours : 0);

        if (key !== currentKey) {
            if (currentBucket) {
                currentBucket.kw = currentBucket.count > 0 ? currentBucket.sumKw / currentBucket.count : null;
                currentBucket.kvar = currentBucket.countKvar > 0 ? currentBucket.sumKvar / currentBucket.countKvar : null;
                currentBucket.kwh = currentBucket.count > 0 ? currentBucket.sumKwh : null;
                aggregated.push(currentBucket);
            }
            
            let bucketTime = ts.getTime();
            if(aggLevel === '1h') bucketTime = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), ts.getHours(), 0).getTime();
            if(aggLevel === '1d') bucketTime = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate()).getTime();
            if(aggLevel === '1w') {
                const day = ts.getDay() || 7;
                const firstDay = new Date(ts);
                firstDay.setHours(0,0,0,0);
                firstDay.setDate(ts.getDate() - day + 1);
                bucketTime = firstDay.getTime();
            }
            if(aggLevel === '1M') bucketTime = new Date(ts.getFullYear(), ts.getMonth(), 1).getTime();

            currentBucket = {
                timestamp: bucketTime,
                dateObj: new Date(bucketTime),
                sumKw: hasKw ? d.kw : 0,
                sumKvar: Number.isFinite(d.kvar) ? d.kvar : 0,
                sumKwh: intervalKwh,
                maxKw: hasKw ? d.kw : null,
                minKw: hasKw ? d.kw : null,
                count: hasKw ? 1 : 0,
                countKvar: Number.isFinite(d.kvar) ? 1 : 0
            };
            currentKey = key;
        } else {
            if (hasKw) {
                currentBucket.sumKw += d.kw;
                currentBucket.count++;
                currentBucket.sumKwh += intervalKwh;
                if (currentBucket.maxKw === null || d.kw > currentBucket.maxKw) currentBucket.maxKw = d.kw;
                if (currentBucket.minKw === null || d.kw < currentBucket.minKw) currentBucket.minKw = d.kw;
            }
            if (Number.isFinite(d.kvar)) {
                currentBucket.sumKvar += d.kvar;
                currentBucket.countKvar++;
            }
        }
    });

    if (currentBucket) {
        currentBucket.kw = currentBucket.count > 0 ? currentBucket.sumKw / currentBucket.count : null;
        currentBucket.kvar = currentBucket.countKvar > 0 ? currentBucket.sumKvar / currentBucket.countKvar : null;
        currentBucket.kwh = currentBucket.count > 0 ? currentBucket.sumKwh : null;
        aggregated.push(currentBucket);
    }

    cachedAggregations[cacheKey] = aggregated;
    return aggregated;
}

function updateDashboard() {
    try {
        if (activeDatasetIds.length === 0) return;

        // Auto-recover out of bounds date range
        let activeMinDate = null;
        let activeMaxDate = null;
        const activeDatasets = activeDatasetIds.map(idx => allDatasets[idx]).filter(Boolean);
        
        activeDatasets.forEach(ds => {
            if (ds && ds.data && ds.data.length > 0) {
                const dStart = ds.data[0].dateObj;
                const dEnd = ds.data[ds.data.length - 1].dateObj;
                if (!activeMinDate || (dStart && dStart < activeMinDate)) activeMinDate = dStart;
                if (!activeMaxDate || (dEnd && dEnd > activeMaxDate)) activeMaxDate = dEnd;
            }
        });

        if (activeMinDate && activeMaxDate && globalDateRange.start && globalDateRange.end) {
            const startMs = globalDateRange.start.getTime();
            const endMs = globalDateRange.end.getTime();
            const dsMinMs = activeMinDate.getTime();
            const dsMaxMs = activeMaxDate.getTime();

            // If selected range does not overlap at all with active data, snap to active data range
            if (endMs < dsMinMs || startMs > dsMaxMs) {
                globalDateRange.start = new Date(activeMinDate.getFullYear(), activeMinDate.getMonth(), activeMinDate.getDate(), 0, 0, 0);
                globalDateRange.end = new Date(activeMaxDate.getFullYear(), activeMaxDate.getMonth(), activeMaxDate.getDate(), 23, 59, 59);
                
                const inputDateStart = document.getElementById('date-start');
                const inputDateEnd = document.getElementById('date-end');
                if (inputDateStart) inputDateStart.value = getLocalDateString(globalDateRange.start);
                if (inputDateEnd) inputDateEnd.value = getLocalDateString(globalDateRange.end);
            }
        }

        const firstActiveData = getFilteredData(activeDatasetIds[0]);
        if (firstActiveData.length === 0) return;

        // Update header dropdown file list
        const menuFileList = document.getElementById('header-menu-file-list');
        const menuFileCount = document.getElementById('header-menu-file-count');
        if (menuFileList && typeof allDatasets !== 'undefined' && allDatasets) {
            if (menuFileCount) menuFileCount.textContent = allDatasets.length;
            menuFileList.innerHTML = allDatasets.map(ds => `<div style="padding: 0.25rem 0; line-height: 1.3;">• ${escapeHtml(ds.name)}</div>`).join('');
        }

        // Sync state with dropdown value
        if (selectAggregation) {
            currentAggregation = selectAggregation.value;
        }

        // --- Auto aggregation logic ---
        if (!isManualAggregation) {
            const startMs = globalDateRange.start.getTime();
            const endMs = globalDateRange.end.getTime();
            const diffDays = (endMs - startMs) / (24 * 60 * 60 * 1000);

            let targetAgg = '1d';
            if (diffDays <= 3) {
                targetAgg = '15m';
            } else if (diffDays <= 30) {
                targetAgg = '1h';
            } else if (diffDays <= 365) {
                targetAgg = '1d';
            } else {
                targetAgg = '1w';
            }

            if (currentAggregation !== targetAgg) {
                currentAggregation = targetAgg;
                if (selectAggregation) {
                    selectAggregation.value = targetAgg;
                }
            }
        }

        // Update active state of aggregation buttons to always match current state
        document.querySelectorAll('.btn-agg-select').forEach(b => {
            b.classList.toggle('active', b.dataset.agg === currentAggregation);
        });

        // Use one shared tariff-time configuration for every dashboard view.
        const { ntStartMin, ntEndMin, stStartMin, stEndMin, stAktiv } = getTariffInputConfig();

        // Combined KPI Calculation across all active datasets
        let globalMaxObj = null;
        let globalMinObj = null;
        let totalSumKw = 0;
        let totalCountKw = 0;
        
        let totalEnergyWh = 0;
        let totalEnergyWhHT = 0;
        let totalEnergyWhNT = 0;
        let totalEnergyWhST = 0;

        let totalRowsCombined = 0;
        let invalidRowsCombined = 0;
        let totalMissingCount = 0;
        let totalDuplicateCount = 0;
        let totalImplausibleCount = 0;

        const activeAggregatedDatasets = [];
        const activeFilteredDatasets = [];

        // Determine targeted dataset for Statistics single-dataset KPIs
        const selectStatsDs = document.getElementById('select-stats-dataset');
        let selectedStatsDsId = activeDatasetIds[0];
        if (selectStatsDs && selectStatsDs.value !== '') {
            const parsedVal = parseInt(selectStatsDs.value, 10);
            if (activeDatasetIds.includes(parsedVal)) {
                selectedStatsDsId = parsedVal;
            }
        }

        activeDatasetIds.forEach(dsId => {
            const ds = allDatasets[dsId];
            const isTargetStatsDs = (dsId === selectedStatsDsId);

            if (ds) {
                totalRowsCombined += ds.totalRowsCount || 0;
                invalidRowsCombined += ds.invalidRowsCount || 0;
            }

            const filteredData = getFilteredData(dsId);
            if (filteredData.length === 0) return;

            activeFilteredDatasets.push({ id: dsId, name: allDatasets[dsId].name, data: filteredData });

            // Aggregate exactly the visible range. This keeps the bucket count
            // and exported/charted data consistent with the selected period.
            const aggData = aggregateData(filteredData, currentAggregation, dsId);
            activeAggregatedDatasets.push({ id: dsId, name: allDatasets[dsId].name, data: aggData });

            // Count missing, duplicate, and implausible intervals for all active datasets
            const stepMs15 = 15 * 60 * 1000;
            const toleranceMs15 = 60 * 1000;
            let missingCount = 0;
            for (let i = 1; i < filteredData.length; i++) {
                const diff = filteredData[i].timestamp - filteredData[i - 1].timestamp;
                if (diff > stepMs15 + toleranceMs15) {
                    missingCount += Math.max(0, Math.round(diff / stepMs15) - 1);
                }
            }
            totalMissingCount += missingCount;

            let duplicateCount = 0;
            const seenTimestamps = new Set();
            filteredData.forEach(pt => {
                if (seenTimestamps.has(pt.timestamp)) {
                    duplicateCount++;
                } else {
                    seenTimestamps.add(pt.timestamp);
                }
            });
            totalDuplicateCount += duplicateCount;

            const implausibleCount = filteredData.filter(pt => !Number.isFinite(pt.kw) || pt.kw < 0 || pt.kw > 100000).length;
            totalImplausibleCount += implausibleCount;

            if (isTargetStatsDs) {
                filteredData.forEach(d => {
                    if (!Number.isFinite(d.kw) || d.kw < 0 || d.kw > 100000) return;
                    
                    if (globalMaxObj === null || d.kw > globalMaxObj.kw) {
                        globalMaxObj = { kw: d.kw, dateStr: d.dateStr, timeStr: d.timeStr, dsName: allDatasets[dsId].name };
                    }
                    if (globalMinObj === null || d.kw < globalMinObj.kw) {
                        globalMinObj = { kw: d.kw, dateStr: d.dateStr, timeStr: d.timeStr, dsName: allDatasets[dsId].name };
                    }
                    
                    totalSumKw += d.kw;
                    totalCountKw++;

                    // Measurements are interval averages timestamped at the
                    // interval end. Use the measured interval energy (kWh)
                    // rather than a trapezoid between neighboring samples;
                    // this avoids dropping the first interval and preserves
                    // MSCONS quantities exactly.
                    const dt = typeof getMeasurementIntervalHours === 'function'
                        ? getMeasurementIntervalHours(d)
                        : 0.25;
                    const kwh = typeof getMeasurementEnergyKwh === 'function'
                        ? getMeasurementEnergyKwh(d)
                        : d.kw * dt;
                    if (kwh === null || !Number.isFinite(kwh) || kwh < 0) return;
                    const endMs = Number(d.timestamp);
                    const startMs = Number.isFinite(d.intervalStartUtc)
                        ? d.intervalStartUtc
                        : endMs - dt * 3600000;
                    const wh = kwh * 1000;
                    totalEnergyWh += wh;

                    const fractions = getIntervalTariffFractions(
                        startMs,
                        endMs,
                        ntStartMin,
                        ntEndMin,
                        stStartMin,
                        stEndMin,
                        stAktiv,
                        { weekendsNt: true, holidaysNt: true }
                    );
                    totalEnergyWhNT += wh * fractions.ntFraction;
                    totalEnergyWhST += wh * fractions.stFraction;
                    totalEnergyWhHT += wh * fractions.htFraction;
                });
            }
        });

        // Update single-dataset selector in Statistics frame
        const statsDsNameEl = document.getElementById('stats-kpi-ds-name');
        const statsRangeEl = document.getElementById('stats-kpi-range');

        if (selectStatsDs && allDatasets && allDatasets.length > 0) {
            const activeDsList = activeDatasetIds.map(id => ({ id: id, name: allDatasets[id]?.name || `Lastgang ${id+1}` }));
            const currentSelVal = parseInt(selectStatsDs.value, 10);
            
            // Build options list
            selectStatsDs.innerHTML = activeDsList.map(item => 
                `<option value="${item.id}" ${item.id === currentSelVal ? 'selected' : ''}>${escapeHtml(item.name)}</option>`
            ).join('');

            const selectedDsId = !isNaN(currentSelVal) && activeDatasetIds.includes(currentSelVal) ? currentSelVal : activeDatasetIds[0];
            selectStatsDs.value = selectedDsId;

            const currentDs = allDatasets[selectedDsId];
            if (currentDs && statsDsNameEl) {
                statsDsNameEl.textContent = currentDs.name;
            }
        }

        if (firstActiveData[0] && firstActiveData[firstActiveData.length - 1] && statsRangeEl) {
            const dStart = firstActiveData[0].dateObj;
            const dEnd = firstActiveData[firstActiveData.length - 1].dateObj;
            if (dStart && dEnd) {
                const durationMs = dEnd.getTime() - dStart.getTime() + 15 * 60 * 1000;
                const days = Math.round(durationMs / (1000 * 60 * 60 * 24));
                statsRangeEl.textContent = `${dStart.toLocaleDateString('de-DE')} bis ${dEnd.toLocaleDateString('de-DE')} (${days} Tage)`;
            } else {
                statsRangeEl.textContent = `${firstActiveData[0].dateStr} - ${firstActiveData[firstActiveData.length-1].dateStr}`;
            }
        }

        const kpiMax = document.getElementById('kpi-max');
        const kpiMaxTime = document.getElementById('kpi-max-time');
        const kpiMin = document.getElementById('kpi-min');
        const kpiMinTime = document.getElementById('kpi-min-time');
        const kpiAvg = document.getElementById('kpi-avg');
        const kpiCount = document.getElementById('kpi-count');
        const kpiRange = document.getElementById('kpi-range');

        const isKwh = typeof displayUnit !== 'undefined' && displayUnit === 'kwh';
        const displayUnitSuffix = isKwh ? 'kWh' : 'kW';

        const kpiMaxCardTitle = document.getElementById('kpi-title-max');
        if (kpiMaxCardTitle) {
            kpiMaxCardTitle.textContent = isKwh ? 'Max. Viertelstundenarbeit' : 'Max. Leistung';
        }
        const kpiMinCardTitle = document.getElementById('kpi-title-min');
        if (kpiMinCardTitle) {
            kpiMinCardTitle.textContent = isKwh ? 'Min. Viertelstundenarbeit' : 'Min. Leistung';
        }
        const kpiAvgCardTitle = document.getElementById('kpi-title-avg');
        if (kpiAvgCardTitle) {
            kpiAvgCardTitle.textContent = isKwh ? 'Durchschnitt (Arbeit)' : 'Durchschnitt';
        }

        if (globalMaxObj) {
            const val = isKwh ? globalMaxObj.kw / 4.0 : globalMaxObj.kw;
            kpiMax.innerHTML = `${val.toFixed(2)} <span class="unit">${displayUnitSuffix}</span>`;
            kpiMaxTime.textContent = `${globalMaxObj.dateStr} ${globalMaxObj.timeStr}`;
        } else {
            kpiMax.innerHTML = `- <span class="unit">${displayUnitSuffix}</span>`;
            kpiMaxTime.textContent = `-`;
        }
        
        if (globalMinObj) {
            const val = isKwh ? globalMinObj.kw / 4.0 : globalMinObj.kw;
            kpiMin.innerHTML = `${val.toFixed(2)} <span class="unit">${displayUnitSuffix}</span>`;
            kpiMinTime.textContent = `${globalMinObj.dateStr} ${globalMinObj.timeStr}`;
        } else {
            kpiMin.innerHTML = `- <span class="unit">${displayUnitSuffix}</span>`;
            kpiMinTime.textContent = `-`;
        }
        
        if (totalCountKw > 0) {
            const avgKw = totalSumKw / totalCountKw;
            const val = isKwh ? avgKw / 4.0 : avgKw;
            kpiAvg.innerHTML = `${val.toFixed(2)} <span class="unit">${displayUnitSuffix}</span>`;
        } else {
            kpiAvg.innerHTML = `- <span class="unit">${displayUnitSuffix}</span>`;
        }
        
        let totalLength = 0;
        activeFilteredDatasets.forEach(item => { totalLength += item.data.length; });
        if (kpiCount) kpiCount.textContent = totalLength.toLocaleString('de-DE');
        if (kpiRange) kpiRange.textContent = 'Gültige Messungen';

        // Render Energy Consumption KPI (Total)
        const totalEnergyKwh = totalEnergyWh / 1000;
        const kpiEnergy = document.getElementById('kpi-energy');
        if (kpiEnergy) {
            if (totalEnergyKwh >= 10000) {
                kpiEnergy.innerHTML = `${(totalEnergyKwh / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="unit">MWh</span>`;
            } else {
                kpiEnergy.innerHTML = `${totalEnergyKwh.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="unit">kWh</span>`;
            }
        }

        // Render HT / NT / ST split KPIs (Priority 3 - HT / NT / ST Extension)
        const totalEnergyKwhHT = totalEnergyWhHT / 1000;
        const totalEnergyKwhNT = totalEnergyWhNT / 1000;
        const totalEnergyKwhST = totalEnergyWhST / 1000;
        
        const kpiEnergyHT = document.getElementById('kpi-energy-ht');
        const kpiSubHT = document.getElementById('kpi-sub-ht');
        const kpiEnergyNT = document.getElementById('kpi-energy-nt');
        const kpiSubNT = document.getElementById('kpi-sub-nt');
        const kpiEnergyST = document.getElementById('kpi-energy-st');
        const kpiSubST = document.getElementById('kpi-sub-st');
        const kpiCardST = document.getElementById('kpi-card-st');

        const formatEnergyVal = (kwh) => {
            if (kwh >= 10000) {
                return `${(kwh / 1000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="unit">MWh</span>`;
            }
            return `${kwh.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="unit">kWh</span>`;
        };

        if (kpiEnergyHT) kpiEnergyHT.innerHTML = formatEnergyVal(totalEnergyKwhHT);
        if (kpiEnergyNT) kpiEnergyNT.innerHTML = formatEnergyVal(totalEnergyKwhNT);
        
        if (stAktiv) {
            if (kpiCardST) kpiCardST.style.display = 'block';
            if (kpiEnergyST) kpiEnergyST.innerHTML = formatEnergyVal(totalEnergyKwhST);
        } else {
            if (kpiCardST) kpiCardST.style.display = 'none';
        }

        const totalKwh = totalEnergyKwhHT + totalEnergyKwhNT + (stAktiv ? totalEnergyKwhST : 0);
        if (totalKwh > 0) {
            const pctHT = (totalEnergyKwhHT / totalKwh) * 100;
            const pctNT = (totalEnergyKwhNT / totalKwh) * 100;
            const pctST = (totalEnergyKwhST / totalKwh) * 100;
            if (kpiSubHT) kpiSubHT.textContent = `Hochtarif (HT): ${pctHT.toFixed(1)} %`;
            if (kpiSubNT) kpiSubNT.textContent = `Niedertarif (NT): ${pctNT.toFixed(1)} %`;
            if (kpiSubST) kpiSubST.textContent = `Standardtarif (ST): ${pctST.toFixed(1)} %`;
        } else {
            if (kpiSubHT) kpiSubHT.textContent = `Hochtarif (HT)`;
            if (kpiSubNT) kpiSubNT.textContent = `Niedertarif (NT)`;
            if (kpiSubST) kpiSubST.textContent = `Standardtarif (ST)`;
        }

        const kpiQuality = document.getElementById('kpi-quality');
        const kpiQualitySub = document.getElementById('kpi-quality-sub');

        if (kpiQuality) {
            const totalActualAndMissing = totalRowsCombined + totalMissingCount;
            const totalBad = invalidRowsCombined + totalMissingCount + totalDuplicateCount + totalImplausibleCount;
            const pctQuality = totalActualAndMissing > 0 ? ((totalActualAndMissing - totalBad) / totalActualAndMissing) * 100 : 100;
            kpiQuality.innerHTML = `${Math.max(0, pctQuality).toFixed(2)} <span class="unit">%</span>`;
            
            const issues = [];
            if (invalidRowsCombined > 0) issues.push(`${invalidRowsCombined.toLocaleString('de-DE')} ungültig`);
            if (totalMissingCount > 0) issues.push(`${totalMissingCount.toLocaleString('de-DE')} fehlend`);
            if (totalDuplicateCount > 0) issues.push(`${totalDuplicateCount.toLocaleString('de-DE')} doppelt`);
            if (totalImplausibleCount > 0) issues.push(`${totalImplausibleCount.toLocaleString('de-DE')} implausibel`);
            
            const warningDot = document.getElementById('statistik-warning-dot');
            if (issues.length > 0) {
                kpiQualitySub.textContent = issues.join(', ') + ' übersprungen';
                kpiQualitySub.style.color = 'var(--warning-color)';
                if (warningDot) warningDot.classList.remove('hidden');
            } else {
                kpiQualitySub.textContent = `100% fehlerfreie Messwerte`;
                kpiQualitySub.style.color = '';
                if (warningDot) warningDot.classList.add('hidden');
            }
        }

        // Tab-selective rendering to maximize performance
        const activeTabEl = document.querySelector('.tab-btn.active');
        const activeTarget = activeTabEl ? activeTabEl.dataset.target : 'tab-lastgang';

        // Render Timeline Chart (only when Timeline tab is active)
        if (activeTarget === 'tab-lastgang' && !isMinimapZooming) {
            renderTimelineChart(activeAggregatedDatasets);
        }

        // Render Daily Profile Chart (VDE comparison) only when Tagesprofil tab is active
        if (activeTarget === 'tab-tagesprofil') {
            renderDailyProfileChart(activeFilteredDatasets);
        }

        // Render Peaks, Pivot, and Quality Log only when Statistik tab is active with lazy loading per section
        if (activeTarget === 'tab-statistik') {
            const secQualityBody = document.querySelector('#section-quality .stats-section-body');
            const secKpisBody = document.querySelector('#section-kpis .stats-section-body');
            const secPeriodsBody = document.querySelector('#section-periods .stats-section-body');

            // Section 1: Quality Log (always when section 1 body is expanded/visible)
            if (!secQualityBody || secQualityBody.style.display !== 'none') {
                renderQualityLog(activeFilteredDatasets);
            }

            // Section 2: Peaks (lazy load only when section 2 body is expanded)
            if (secKpisBody && secKpisBody.style.display !== 'none') {
                let allPoints = [];
                activeFilteredDatasets.forEach(item => {
                    allPoints = allPoints.concat(item.data);
                });
                renderPeaks(allPoints);
            }

            // Section 3: Periodenauswertung / Pivot Table (lazy load only when section 3 body is expanded)
            if (secPeriodsBody && secPeriodsBody.style.display !== 'none') {
                updatePivotTable(activeFilteredDatasets);
            }
        }
        
        const activeTab = document.querySelector('.tab-btn.active');
        const isAgnesTab = activeTab && activeTab.dataset.target && activeTab.dataset.target.startsWith('tab-agnes');
        if (isAgnesTab) {
            updateAgnesOptimization(activeFilteredDatasets);
        }
        
        // Reload table values in editor tab if it's active and not currently editing
        if (typeof loadTableValuesToEditor === 'function' && !isSavingFromEditor) {
            loadTableValuesToEditor();
        }
    } catch (error) {
        console.error("Error in updateDashboard:", error);
        showToast("Fehler bei der Dashboard-Aktualisierung: " + error.message, "error");
    }
}

function updatePivotTable(activeFilteredDatasets) {
    const tableSubEl = document.getElementById('pivot-table-subtitle');
    const thead = document.getElementById('pivot-table-thead');
    const tbody = document.getElementById('pivot-table-tbody');
    const tfoot = document.getElementById('pivot-table-tfoot');
    
    if (!tbody || !thead || !tfoot) return;

    // This view also calculates HT/NT/ST energy shares. Read the tariff
    // controls locally instead of relying on variables from updateDashboard.
    const { ntStartMin, ntEndMin, stStartMin, stEndMin, stAktiv } = getTariffInputConfig();

    if (!activeFilteredDatasets || activeFilteredDatasets.length === 0) {
        thead.innerHTML = '<th style="padding: 0.6rem 0.8rem;">Keine Daten</th>';
        tbody.innerHTML = '<tr><td style="text-align: center; color: var(--text-muted); padding: 1rem;">Keine aktiven Daten vorhanden.</td></tr>';
        tfoot.innerHTML = '';
        return;
    }

    const viewSelect = document.getElementById('select-pivot-view');
    const intervalSelect = document.getElementById('select-pivot-interval');
    const modeSelect = document.getElementById('select-pivot-mode');
    
    const pivotView = viewSelect ? viewSelect.value : 'timeline';
    const interval = intervalSelect ? intervalSelect.value : 'month';
    const mode = modeSelect ? modeSelect.value : 'performance';

    const formatNum = (num, decimals = 2) => {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return num.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const isKwh = typeof displayUnit !== 'undefined' && displayUnit === 'kwh';

    if (thead.parentElement) {
        thead.parentElement.classList.remove('table-header-rotated');
    }

    // --- ANSICHT 3: ZÄHLPUNKT-VERGLEICH (Zählpunkte nebeneinander) ---
    if (pivotView === 'datasets') {
        if (tableSubEl) {
            tableSubEl.textContent = `Direktvergleich von ${activeFilteredDatasets.length} Datenreihen / Lastgängen`;
        }

        const unitKw = isKwh ? 'kWh' : 'kW';
        thead.innerHTML = `
            <th style="padding: 0.6rem 0.8rem;">Datenreihe / Lastgang</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">Max. Peak (${unitKw})</th>
            <th style="padding: 0.6rem 0.8rem;">Zeitpunkt der Spitze</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">Gesamtenergie (kWh)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">HT-Verbrauch (kWh)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">HT-Anteil (%)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">NT-Verbrauch (kWh)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">NT-Anteil (%)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">Lastfaktor (%)</th>
        `;

        let tbodyHtml = '';
        let globalMaxPeak = 0;
        let globalSumWh = 0;
        let globalHTWh = 0;
        let globalNTWh = 0;

        activeFilteredDatasets.forEach(ds => {
            let maxObj = null;
            let totalWh = 0;
            let htWh = 0;
            let ntWh = 0;
            let sumKw = 0;
            let countKw = 0;

            const len = ds.data.length;
            ds.data.forEach((d, i) => {
                if (!Number.isFinite(Number(d.kw)) || Number(d.kw) < 0) return;
                const intHours = typeof getMeasurementIntervalHours === 'function' ? getMeasurementIntervalHours(d) : 0.25;
                const energyKwh = typeof getMeasurementEnergyKwh === 'function' ? getMeasurementEnergyKwh(d) : d.kw * intHours;
                if (energyKwh === null) return;
                const kwVal = isKwh ? energyKwh : d.kw;
                if (!maxObj || kwVal > maxObj.val) {
                    maxObj = { val: kwVal, dateStr: d.dateStr, timeStr: d.timeStr };
                }
                sumKw += kwVal;
                countKw++;

                const wh = energyKwh * 1000;
                totalWh += wh;
                const endMs = Number(d.timestamp);
                const startMs = Number.isFinite(d.intervalStartUtc) ? d.intervalStartUtc : endMs - intHours * 3600000;
                const fractions = getIntervalTariffFractions(startMs, endMs, ntStartMin, ntEndMin, stStartMin, stEndMin, stAktiv, { weekendsNt: true, holidaysNt: true });
                htWh += wh * fractions.htFraction;
                ntWh += wh * fractions.ntFraction;
            });

            const maxK = maxObj ? maxObj.val : 0;
            const peakTimeStr = maxObj ? `${maxObj.dateStr} ${maxObj.timeStr}` : '-';
            const totKwh = totalWh / 1000;
            const htKwh = htWh / 1000;
            const ntKwh = ntWh / 1000;
            const htPct = totKwh > 0 ? (htKwh / totKwh) * 100 : 0;
            const ntPct = totKwh > 0 ? (ntKwh / totKwh) * 100 : 0;
            const avgK = countKw > 0 ? sumKw / countKw : 0;
            const loadFactor = maxK > 0 ? (avgK / maxK) * 100 : 0;

            if (maxK > globalMaxPeak) globalMaxPeak = maxK;
            globalSumWh += totalWh;
            globalHTWh += htWh;
            globalNTWh += ntWh;

            tbodyHtml += `
                <tr>
                    <td style="padding: 0.6rem 0.8rem; font-weight: 600;" title="${escapeHtml(ds.name)}">${escapeHtml(ds.name)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right; font-weight: 600; color: var(--error-color);">${formatNum(maxK, 2)}</td>
                    <td style="padding: 0.6rem 0.8rem; font-size: 0.82rem;">${peakTimeStr}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right; font-weight: 600;">${formatNum(totKwh, 0)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(htKwh, 0)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(htPct, 1)} %</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(ntKwh, 0)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(ntPct, 1)} %</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(loadFactor, 1)} %</td>
                </tr>
            `;
        });

        tbody.innerHTML = tbodyHtml;

        const globalTotKwh = globalSumWh / 1000;
        const globalHTKwh = globalHTWh / 1000;
        const globalNTKwh = globalNTWh / 1000;
        const globalHTPct = globalTotKwh > 0 ? (globalHTKwh / globalTotKwh) * 100 : 0;
        const globalNTPct = globalTotKwh > 0 ? (globalNTKwh / globalTotKwh) * 100 : 0;

        tfoot.innerHTML = `
            <tr>
                <td style="padding: 0.6rem 0.8rem;">SUMME / GESAMT</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right; color: var(--error-color);">${formatNum(globalMaxPeak, 2)}</td>
                <td style="padding: 0.6rem 0.8rem;">-</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(globalTotKwh, 0)}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(globalHTKwh, 0)}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(globalHTPct, 1)} %</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(globalNTKwh, 0)}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(globalNTPct, 1)} %</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">-</td>
            </tr>
        `;
        return;
    }

    // --- ANSICHT 2: PIVOT-MATRIX (Horizontal mit 45° Köpfen) ---
    if (pivotView === 'matrix' || mode === 'pivot_peak' || mode === 'pivot_energy') {
        const monthsSet = new Set();
        const matrix = {};

        activeFilteredDatasets.forEach(ds => {
            matrix[ds.name] = {};
            const len = ds.data.length;
            ds.data.forEach((d, i) => {
                const dateObj = d.dateObj instanceof Date ? d.dateObj : new Date(d.timestamp);
                if (!Number.isFinite(dateObj.getTime()) || !Number.isFinite(Number(d.kw)) || Number(d.kw) < 0) return;
                const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                monthsSet.add(monthKey);

                if (!matrix[ds.name][monthKey]) {
                    matrix[ds.name][monthKey] = { maxKw: 0, totalWh: 0 };
                }
                const intHours = typeof getMeasurementIntervalHours === 'function' ? getMeasurementIntervalHours(d) : 0.25;
                const energyKwh = typeof getMeasurementEnergyKwh === 'function' ? getMeasurementEnergyKwh(d) : d.kw * intHours;
                if (energyKwh === null) return;
                const kwVal = isKwh ? energyKwh : d.kw;
                if (kwVal > matrix[ds.name][monthKey].maxKw) {
                    matrix[ds.name][monthKey].maxKw = kwVal;
                }
                matrix[ds.name][monthKey].totalWh += (energyKwh * 1000);
            });
        });

        const sortedMonths = Array.from(monthsSet).sort();
        const monthLabels = sortedMonths.map(m => {
            const [y, mNum] = m.split('-');
            const date = new Date(parseInt(y, 10), parseInt(mNum, 10) - 1, 1);
            return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
        });

        const isPeak = mode === 'pivot_peak';
        const metricName = isPeak ? (isKwh ? 'Peak (kWh)' : 'Peak (kW)') : 'Verbrauch (kWh)';

        if (tableSubEl) {
            tableSubEl.textContent = `Pivot-Matrix: ${metricName} im Monatsverlauf`;
        }

        if (thead.parentElement) {
            thead.parentElement.classList.add('table-header-rotated');
        }

        let theadHtml = `<th style="padding: 0.6rem 0.8rem; vertical-align: bottom;">Datenreihe / Lastgang</th>`;
        sortedMonths.forEach((m, idx) => {
            theadHtml += `<th class="th-rotated"><div>${monthLabels[idx]}</div></th>`;
        });
        theadHtml += `<th style="padding: 0.6rem 0.8rem; text-align: right; vertical-align: bottom;">Gesamt (${metricName})</th>`;
        thead.innerHTML = theadHtml;

        let tbodyHtml = '';
        const monthColTotals = new Array(sortedMonths.length).fill(0);
        let overallMatrixTotal = 0;

        Object.keys(matrix).forEach(dsName => {
            let rowHtml = `<tr><td style="padding: 0.6rem 0.8rem; font-weight: 600;" title="${escapeHtml(dsName)}">${escapeHtml(dsName)}</td>`;
            let dsRowTotal = 0;

            sortedMonths.forEach((mKey, colIdx) => {
                const cell = matrix[dsName][mKey];
                let val = 0;
                if (cell) {
                    val = isPeak ? cell.maxKw : (cell.totalWh / 1000);
                }

                if (isPeak) {
                    if (val > dsRowTotal) dsRowTotal = val;
                    if (val > monthColTotals[colIdx]) monthColTotals[colIdx] = val;
                } else {
                    dsRowTotal += val;
                    monthColTotals[colIdx] += val;
                }

                rowHtml += `<td style="padding: 0.6rem 0.8rem; text-align: right;">${val > 0 ? formatNum(val, isPeak ? 2 : 0) : '-'}</td>`;
            });

            if (isPeak) {
                if (dsRowTotal > overallMatrixTotal) overallMatrixTotal = dsRowTotal;
            } else {
                overallMatrixTotal += dsRowTotal;
            }

            rowHtml += `<td style="padding: 0.6rem 0.8rem; text-align: right; font-weight: 700;">${formatNum(dsRowTotal, isPeak ? 2 : 0)}</td></tr>`;
            tbodyHtml += rowHtml;
        });

        tbody.innerHTML = tbodyHtml;

        let tfootHtml = `<tr><td style="padding: 0.6rem 0.8rem;">SUMME / MAXIMA</td>`;
        sortedMonths.forEach((mKey, colIdx) => {
            tfootHtml += `<td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(monthColTotals[colIdx], isPeak ? 2 : 0)}</td>`;
        });
        tfootHtml += `<td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(overallMatrixTotal, isPeak ? 2 : 0)}</td></tr>`;
        tfoot.innerHTML = tfootHtml;
        return;
    }

    // --- ANSICHT 1: PERIODEN-VERLAUF (Monatlich / Quartalsweise / Wöchentlich / Täglich) ---
    if (activeFilteredDatasets.length === 1) {
        const ds = activeFilteredDatasets[0];
        const minD = ds.data[0]?.dateStr || '-';
        const maxD = ds.data[ds.data.length - 1]?.dateStr || '-';
        const durationDays = ds.data[0] && ds.data[ds.data.length - 1] ? 
            Math.round((ds.data[ds.data.length - 1].dateObj - ds.data[0].dateObj) / (1000 * 60 * 60 * 24)) + 1 : 0;
        if (tableSubEl) {
            tableSubEl.textContent = `Lastgang: ${ds.name} | Zeitraum: ${minD} bis ${maxD} (${durationDays} Tage)`;
        }
    } else {
        if (tableSubEl) {
            tableSubEl.textContent = `${activeFilteredDatasets.length} Lastgänge aggregiert im Perioden-Verlauf`;
        }
    }

    const groups = {};

    activeFilteredDatasets.forEach(ds => {
        const len = ds.data.length;
        ds.data.forEach((d, i) => {
            const dateObj = d.dateObj instanceof Date ? d.dateObj : new Date(d.timestamp);
            if (!Number.isFinite(dateObj.getTime()) || !Number.isFinite(Number(d.kw)) || Number(d.kw) < 0) return;

            let gKey = '';

            if (interval === 'month') {
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                gKey = `${y}-${m}`;
            } else if (interval === 'quarter') {
                const y = dateObj.getFullYear();
                const q = Math.floor(dateObj.getMonth() / 3) + 1;
                gKey = `${y}-Q${q}`;
            } else if (interval === 'week') {
                const tempD = new Date(dateObj.getTime());
                tempD.setHours(0, 0, 0, 0);
                tempD.setDate(tempD.getDate() + 3 - (tempD.getDay() + 6) % 7);
                const week1 = new Date(tempD.getFullYear(), 0, 4);
                const weekNum = 1 + Math.round(((tempD - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                const y = tempD.getFullYear();
                gKey = `${y}-W${String(weekNum).padStart(2, '0')}`;
            } else if (interval === 'day') {
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                gKey = `${y}-${m}-${day}`;
            } else if (interval === 'dataset') {
                gKey = ds.name;
            }

            if (!groups[gKey]) {
                let gLabel = '';
                if (interval === 'month') {
                    const [y, m] = gKey.split('-');
                    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
                    gLabel = dateObj.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
                } else if (interval === 'quarter') {
                    const [y, q] = gKey.split('-Q');
                    gLabel = `Quartal ${q} ${y}`;
                } else if (interval === 'week') {
                    const [y, w] = gKey.split('-W');
                    gLabel = `KW ${w} / ${y}`;
                } else if (interval === 'day') {
                    const [y, m, day] = gKey.split('-');
                    gLabel = `${day}.${m}.${y}`;
                } else {
                    gLabel = ds.name;
                }

                groups[gKey] = {
                    label: gLabel,
                    sortKey: gKey,
                    maxKw: -Infinity,
                    minKw: Infinity,
                    sumKw: 0,
                    countKw: 0,
                    totalWh: 0,
                    whHT: 0,
                    whNT: 0,
                    whST: 0
                };
            }

            const intHours = typeof getMeasurementIntervalHours === 'function' ? getMeasurementIntervalHours(d) : 0.25;
            const energyKwh = typeof getMeasurementEnergyKwh === 'function' ? getMeasurementEnergyKwh(d) : d.kw * intHours;
            if (energyKwh === null) return;
            const kwVal = isKwh ? energyKwh : d.kw;
            const g = groups[gKey];
            if (kwVal > g.maxKw) g.maxKw = kwVal;
            if (kwVal < g.minKw) g.minKw = kwVal;
            g.sumKw += kwVal;
            g.countKw++;

            const wh = energyKwh * 1000;
            g.totalWh += wh;
            const endMs = Number(d.timestamp);
            const startMs = Number.isFinite(d.intervalStartUtc) ? d.intervalStartUtc : endMs - intHours * 3600000;
            const fractions = getIntervalTariffFractions(startMs, endMs, ntStartMin, ntEndMin, stStartMin, stEndMin, stAktiv, { weekendsNt: true, holidaysNt: true });
            g.whHT += wh * fractions.htFraction;
            g.whNT += wh * fractions.ntFraction;
            g.whST += wh * fractions.stFraction;
        });
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => groups[a].sortKey.localeCompare(groups[b].sortKey));

    if (mode === 'performance') {
        const unitKw = isKwh ? 'kWh' : 'kW';
        thead.innerHTML = `
            <th style="padding: 0.6rem 0.8rem;">Zeitspanne / Perioden</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">Max. Peak (${unitKw})</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">Gesamtenergie (kWh)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">Min. Leistung (${unitKw})</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">Durchschnitt (${unitKw})</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">Lastfaktor (%)</th>
        `;

        let tbodyHtml = '';
        let globalMaxKw = 0;
        let globalMinKw = Infinity;
        let globalSumWh = 0;
        let globalKwSum = 0;
        let globalKwCount = 0;

        sortedGroupKeys.forEach(gKey => {
            const g = groups[gKey];
            const maxK = g.maxKw !== -Infinity ? g.maxKw : 0;
            const minK = g.minKw !== Infinity ? g.minKw : 0;
            const sumK = g.sumKw;
            const avgK = g.countKw > 0 ? sumK / g.countKw : 0;
            const kwh = g.totalWh / 1000;
            const loadFactor = maxK > 0 ? (avgK / maxK) * 100 : 0;

            if (maxK > globalMaxKw) globalMaxKw = maxK;
            if (minK < globalMinKw) globalMinKw = minK;
            globalSumWh += g.totalWh;
            globalKwSum += sumK;
            globalKwCount += g.countKw;

            tbodyHtml += `
                <tr>
                    <td style="padding: 0.6rem 0.8rem; font-weight: 500;">${escapeHtml(g.label)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right; font-weight: 600; color: var(--error-color);">${formatNum(maxK, 2)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(kwh, 0)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(minK, 2)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(avgK, 2)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(loadFactor, 1)} %</td>
                </tr>
            `;
        });

        tbody.innerHTML = tbodyHtml;

        const globalAvgKw = globalKwCount > 0 ? globalKwSum / globalKwCount : 0;
        const globalLoadFactor = globalMaxKw > 0 ? (globalAvgKw / globalMaxKw) * 100 : 0;
        const globalKwh = globalSumWh / 1000;

        tfoot.innerHTML = `
            <tr>
                <td style="padding: 0.6rem 0.8rem;">SUMME / GESAMT</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right; color: var(--error-color);">${formatNum(globalMaxKw, 2)}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(globalKwh, 0)}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${globalMinKw !== Infinity ? formatNum(globalMinKw, 2) : '-'}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(globalAvgKw, 2)}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(globalLoadFactor, 1)} %</td>
            </tr>
        `;
    } else if (mode === 'tariffs') {
        thead.innerHTML = `
            <th style="padding: 0.6rem 0.8rem;">Zeitspanne / Perioden</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">Gesamt (kWh)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">HT-Verbrauch (kWh)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">HT-Anteil (%)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">NT-Verbrauch (kWh)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">NT-Anteil (%)</th>
            <th style="padding: 0.6rem 0.8rem; text-align: right;">ST-Verbrauch (kWh)</th>
        `;

        let tbodyHtml = '';
        let sumTotalWh = 0;
        let sumHTWh = 0;
        let sumNTWh = 0;
        let sumSTWh = 0;

        sortedGroupKeys.forEach(gKey => {
            const g = groups[gKey];
            const totKwh = g.totalWh / 1000;
            const htKwh = g.whHT / 1000;
            const ntKwh = g.whNT / 1000;
            const stKwh = g.whST / 1000;

            const htPct = totKwh > 0 ? (htKwh / totKwh) * 100 : 0;
            const ntPct = totKwh > 0 ? (ntKwh / totKwh) * 100 : 0;

            sumTotalWh += g.totalWh;
            sumHTWh += g.whHT;
            sumNTWh += g.whNT;
            sumSTWh += g.whST;

            tbodyHtml += `
                <tr>
                    <td style="padding: 0.6rem 0.8rem; font-weight: 500;">${escapeHtml(g.label)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right; font-weight: 600;">${formatNum(totKwh, 0)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(htKwh, 0)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(htPct, 1)} %</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(ntKwh, 0)}</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(ntPct, 1)} %</td>
                    <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(stKwh, 0)}</td>
                </tr>
            `;
        });

        tbody.innerHTML = tbodyHtml;

        const totAllKwh = sumTotalWh / 1000;
        const htAllKwh = sumHTWh / 1000;
        const ntAllKwh = sumNTWh / 1000;
        const stAllKwh = sumSTWh / 1000;
        const htAllPct = totAllKwh > 0 ? (htAllKwh / totAllKwh) * 100 : 0;
        const ntAllPct = totAllKwh > 0 ? (ntAllKwh / totAllKwh) * 100 : 0;

        tfoot.innerHTML = `
            <tr>
                <td style="padding: 0.6rem 0.8rem;">SUMME / GESAMT</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(totAllKwh, 0)}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(htAllKwh, 0)}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(htAllPct, 1)} %</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(ntAllKwh, 0)}</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(ntAllPct, 1)} %</td>
                <td style="padding: 0.6rem 0.8rem; text-align: right;">${formatNum(stAllKwh, 0)}</td>
            </tr>
        `;
    }
}

function exportPivotCSV() {
    const table = document.getElementById('pivot-table');
    if (!table) return;

    let csv = '';
    const rows = table.querySelectorAll('tr');
    rows.forEach(r => {
        const cols = r.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach(c => {
            let txt = c.textContent.trim().replace(/;/g, ',');
            rowData.push(txt);
        });
        if (rowData.length > 0) {
            csv += rowData.join(';') + '\r\n';
        }
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'perioden_pivot_auswertung.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showToast('Pivot-Tabelle als CSV exportiert.', 'success');
}

function syncProfileButtonLayout(mode) {
    // 1. Sync Wochentage Buttons
    if (mode === 'days') {
        // Multi-select: Sync buttons with checkbox checked states
        document.querySelectorAll('.btn-day-select').forEach(btn => {
            const chk = document.getElementById(btn.dataset.chkId);
            btn.classList.toggle('active', chk ? chk.checked : false);
        });
    } else {
        // Single-select: Sync buttons with select dropdown value
        const dropdown = document.getElementById('select-profile-days');
        const activeVal = dropdown ? dropdown.value : 'all';
        document.querySelectorAll('.btn-day-select').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.dayVal === activeVal);
        });
    }

    // 2. Sync Quartale Buttons
    if (mode === 'quarters') {
        // Multi-select: Sync buttons with checkbox checked states
        document.querySelectorAll('.btn-quarter-select').forEach(btn => {
            const chk = document.getElementById(btn.dataset.chkId);
            btn.classList.toggle('active', chk ? chk.checked : false);
        });
    } else {
// Single-select: Sync buttons with select dropdown value
        const dropdown = document.getElementById('select-profile-quarter');
        const activeVal = dropdown ? dropdown.value : 'all';
        document.querySelectorAll('.btn-quarter-select').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.qVal === activeVal);
        });
    }
}

function syncProfileComparisonButtons(mode = document.getElementById('select-profile-compare-mode')?.value || 'datasets') {
    document.querySelectorAll('.btn-day-select').forEach(btn => {
        const chk = document.getElementById(btn.dataset.chkId);
        const active = mode === 'days'
            ? !!chk?.checked
            : btn.dataset.dayVal === (document.getElementById('select-profile-days')?.value || 'all');
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    document.querySelectorAll('.btn-quarter-select').forEach(btn => {
        const chk = document.getElementById(btn.dataset.chkId);
        const active = mode === 'quarters'
            ? !!chk?.checked
            : btn.dataset.qVal === (document.getElementById('select-profile-quarter')?.value || 'all');
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

// --- Data Editor & Spreadsheet Grid Engine ---
let editorTablePage = 0;
let isEditorEditable = false;
let isSavingFromEditor = false;
let datasetsBackup = null;
let editorSelectionStart = null; // { row, col }
let editorSelectionEnd = null;   // { row, col }
let editorIsDragging = false;
const editorGridPageSize = 1000;
let allTimestampsInSelectedRange = [];
let pageTimestamps = [];
let widthColDatum = 90;
let widthColUhrzeit = 70;

function updateTableTotalWidth() {
    const table = document.getElementById('editor-values-table');
    if (!table) return;
    let total = widthColDatum + widthColUhrzeit;
    allDatasets.forEach(ds => {
        total += (ds.width || 120);
    });
    table.style.width = total + 'px';
}

function createEmptyDataset(name = "Manueller Lastgang", year = 2026) {
    const emptyData = [];
    const start = new Date(`${year}-01-01T00:15:00`);
    const end = new Date(`${year}-01-02T00:00:00`);
    let current = start.getTime();
    while (current <= end.getTime()) {
        const dObj = new Date(current);
        let dateStr = '';
        let timeStr = '';
        if (dObj.getHours() === 0 && dObj.getMinutes() === 0) {
            const prevDate = new Date(current - 15 * 60 * 1000);
            dateStr = getLocalDateString(prevDate).split('-').reverse().join('.');
            timeStr = '24:00';
        } else {
            dateStr = getLocalDateString(dObj).split('-').reverse().join('.');
            timeStr = dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
        emptyData.push({
            timestamp: current,
            dateStr: dateStr,
            timeStr: timeStr,
            dateObj: dObj,
            intervalHours: 0.25,
            intervalStartUtc: current - 15 * 60 * 1000,
            intervalEndUtc: current,
            energyKwh: null,
            kwh: null,
            qualityStatus: 'INVALID',
            kw: null,
            rawKw: null,
            hasData: true
        });
        current += 15 * 60 * 1000;
    }
    return {
        name: name,
        data: emptyData,
        totalRowsCount: emptyData.length,
        invalidRowsCount: emptyData.length,
        importedUnit: "kw"
    };
}

function loadTableValuesToEditor() {
    const tableHeader = document.querySelector('#editor-values-table thead');
    const tableBody = document.querySelector('#editor-values-table tbody');
    const info = document.getElementById('editor-table-info');
    
    if (allDatasets.length === 0) {
        allDatasets.push(createEmptyDataset("Manueller Lastgang", 2026));
    }
    
    // Auto-detect timestamp convention from first data point (00:00 or 00:15 start)
    const editorStepMs = 15 * 60 * 1000;
    let editorOffset = 0;
    if (allDatasets.length > 0 && allDatasets[0].data.length > 0) {
        const fp = new Date(allDatasets[0].data[0].timestamp);
        const fpMs = fp.getHours() * 3600000 + fp.getMinutes() * 60000;
        editorOffset = (fpMs === 0) ? 0 : ((fpMs === editorStepMs) ? editorStepMs : 0);
    }
    
    // Construct all 15m timestamps in range (aligned to detected convention)
    const editorRangeStart = new Date(globalDateRange.start);
    editorRangeStart.setHours(0, 0, 0, 0);
    const startMs = editorRangeStart.getTime() + editorOffset;
    const editorRangeEnd = new Date(globalDateRange.end);
    editorRangeEnd.setHours(0, 0, 0, 0);
    editorRangeEnd.setDate(editorRangeEnd.getDate() + 1);
    const endMs = editorRangeEnd.getTime() - editorStepMs + editorOffset;
    
    allTimestampsInSelectedRange = [];
    let ts = startMs;
    // Cap safety limit to avoid freezing the tab (max 100k rows)
    while (ts <= endMs && allTimestampsInSelectedRange.length < 35040 * 2) {
        allTimestampsInSelectedRange.push(ts);
        ts += 15 * 60 * 1000;
    }
    
    const totalFiltered = allTimestampsInSelectedRange.length;
    
    // Clamp pagination page
    const maxPage = Math.max(0, Math.ceil(totalFiltered / editorGridPageSize) - 1);
    if (editorTablePage > maxPage) {
        editorTablePage = maxPage;
    }
    
    const startIdx = editorTablePage * editorGridPageSize;
    const endIdx = Math.min(startIdx + editorGridPageSize, totalFiltered);
    pageTimestamps = allTimestampsInSelectedRange.slice(startIdx, endIdx);
    
    if (info) {
        info.textContent = totalFiltered > 0 
            ? `Seite ${editorTablePage + 1} von ${maxPage + 1} (${startIdx + 1}-${endIdx})` 
            : "0 Zeilen geladen";
    }
    
    // Render dynamic table headers (Columns: Datum, Uhrzeit, Channels...)
    if (tableHeader) {
        tableHeader.innerHTML = `
            <tr>
                <th style="width: ${widthColDatum}px; text-align: center; position: relative;">Datum<div class="resizer"></div></th>
                <th style="width: ${widthColUhrzeit}px; text-align: center; position: relative;">Uhrzeit<div class="resizer"></div></th>
                ${allDatasets.map((ds, idx) => {
                    const displayUnitSuffix = displayUnit === 'kwh' ? 'kWh' : 'kW';
                    const colWidth = ds.width || 120;
                    return `
                        <th style="width: ${colWidth}px; position: relative;">
                            <span class="column-title" data-idx="${idx}" style="cursor: pointer; display: inline-block; width: calc(100% - 24px); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 4px;" title="Doppelklick zum Umbenennen">${escapeHtml(ds.name)} (${displayUnitSuffix})</span>
                            <button class="btn-delete-col" data-idx="${idx}" title="Lastgang löschen" style="position: absolute; right: 6px; top: 6px; background: transparent; border: none; color: var(--warning-color); cursor: pointer; display: flex; align-items: center; padding: 0.15rem;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <div class="resizer"></div>
                        </th>
                    `;
                }).join('')}
            </tr>
        `;
        
        // Add double-click rename listeners to headers
        tableHeader.querySelectorAll('.column-title').forEach(span => {
            span.addEventListener('dblclick', function(e) {
                const idx = parseInt(this.dataset.idx);
                const ds = allDatasets[idx];
                if (!ds) return;
                
                const currentSpan = this;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = ds.name;
                input.className = 'input-field';
                input.style.width = 'calc(100% - 16px)';
                input.style.height = '24px';
                input.style.fontSize = '0.75rem';
                input.style.padding = '2px 4px';
                input.style.boxSizing = 'border-box';
                input.style.borderRadius = 'var(--radius-sm)';
                input.style.border = '1px solid var(--primary-color)';
                
                currentSpan.replaceWith(input);
                input.focus();
                input.select();
                
                let isFinished = false;
                function finishRename() {
                    if (isFinished) return;
                    isFinished = true;
                    const newName = input.value.trim();
                    if (newName !== "") {
                        ds.name = newName;
                        renderDatasetCheckboxes(true);
                        updateDashboard();
                        showToast("Lastgang-Name erfolgreich aktualisiert!", "success");
                    }
                    loadTableValuesToEditor();
                }
                
                input.addEventListener('keydown', (evt) => {
                    if (evt.key === 'Enter') {
                        evt.preventDefault();
                        finishRename();
                    } else if (evt.key === 'Escape') {
                        evt.preventDefault();
                        isFinished = true;
                        loadTableValuesToEditor();
                    }
                });
                
                input.addEventListener('blur', () => {
                    finishRename();
                });
            });
        });
        
        // Add delete column listeners
        tableHeader.querySelectorAll('.btn-delete-col').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                const ds = allDatasets[idx];
                if (!ds) return;
                
                if (confirm(`Möchtest du den Lastgang "${ds.name}" wirklich komplett löschen?`)) {
                    allDatasets.splice(idx, 1);
                    activeDatasetIds = allDatasets.length > 0 ? [0] : [];
                    currentDatasetId = 0;
                    
                    if (typeof renderDatasetCheckboxes === 'function') {
                        renderDatasetCheckboxes();
                    }
                    
                    cachedAggregations = {};
                    updateDashboard();
                    loadTableValuesToEditor();
                    showToast(`Lastgang "${ds.name}" gelöscht.`, "info");
                }
            });
        });
    }
    
    // Prepare column lookup maps for high performance
    const datasetMaps = allDatasets.map(ds => {
        const map = new Map();
        ds.data.forEach(d => map.set(d.timestamp, d));
        return map;
    });
    
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (totalFiltered === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="${2 + allDatasets.length}" style="text-align:center;color:var(--text-muted);padding: 2rem;">Keine Datenpunkte im gewählten Zeitraum</td>
                </tr>
            `;
            return;
        }
        
        pageTimestamps.forEach((timestamp, r) => {
            const row = document.createElement('tr');
            
            // Generate Date & Time cells
            const firstPointDate = new Date(timestamp);
            let dateStr = '';
            let timeStr = '';
            if (firstPointDate.getHours() === 0 && firstPointDate.getMinutes() === 0) {
                const prevDate = new Date(timestamp - 15 * 60 * 1000);
                dateStr = getLocalDateString(prevDate).split('-').reverse().join('.');
                timeStr = '24:00';
            } else {
                dateStr = getLocalDateString(firstPointDate).split('-').reverse().join('.');
                timeStr = firstPointDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            }
            
            let rowHtml = `
                <td class="cell-readonly cell-center" data-row="${r}" data-col="0">${dateStr}</td>
                <td class="cell-readonly cell-center" data-row="${r}" data-col="1">${timeStr}</td>
            `;
            
            // Generate value cells for each dataset
            allDatasets.forEach((ds, c) => {
                const map = datasetMaps[c];
                const point = map.get(timestamp);
                
                let displayVal = '';
                if (point && Number.isFinite(point.kw)) {
                    const energy = typeof getMeasurementEnergyKwh === 'function' ? getMeasurementEnergyKwh(point) : point.kw * 0.25;
                    displayVal = displayUnit === 'kwh' ? (energy === null ? '' : energy.toFixed(2)) : point.kw.toFixed(2);
                }
                
                rowHtml += `
                    <td 
                        contenteditable="${isEditorEditable ? 'true' : 'false'}"
                        class="editor-cell cell-right ${!isEditorEditable ? 'cell-readonly' : ''}"
                        data-row="${r}"
                        data-col="${2 + c}"
                        data-timestamp="${timestamp}"
                        data-ds-idx="${c}"
                    >${displayVal}</td>
                `;
            });
            
            row.innerHTML = rowHtml;
            tableBody.appendChild(row);
        });
    }
    
    // Restore selection visualization
    updateSelectionHighlight();
    updateTableTotalWidth();
}

function saveCellChange(dsIdx, timestamp, value) {
    const ds = allDatasets[dsIdx];
    if (!ds) return;
    
    let kwVal = value;
    if (displayUnit === 'kwh' && value !== null) {
        kwVal = value * 4.0; // kWh -> kW
    }
    
    // Find point or append if missing
    let point = ds.data.find(d => d.timestamp === timestamp);
    if (!point) {
        const dObj = new Date(timestamp);
        point = {
            timestamp: timestamp,
            dateStr: getLocalDateString(dObj).split('-').reverse().join('.'),
            timeStr: dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            dateObj: dObj,
            intervalHours: 0.25,
            intervalStartUtc: timestamp - 15 * 60 * 1000,
            intervalEndUtc: timestamp,
            energyKwh: null,
            kwh: null,
            qualityStatus: 'INVALID',
            kw: null,
            rawKw: null,
            hasData: true
        };
        ds.data.push(point);
        ds.data.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    // Get scale from channel's importedUnit
    let channelScale = 1.0;
    const channelUnit = ds.importedUnit || 'kw';
    if (channelUnit === "kwh") channelScale = 4.0;
    else if (channelUnit === "w") channelScale = 0.001;
    else if (channelUnit === "wh") channelScale = 0.004;
    else if (channelUnit === "mw") channelScale = 1000.0;
    else if (channelUnit === "mwh") channelScale = 4000.0;
    
    point.kw = kwVal;
    point.rawKw = kwVal !== null ? kwVal / channelScale : null;
    point.intervalHours = (Number.isFinite(point.intervalHours) && point.intervalHours > 0) ? point.intervalHours : 0.25;
    point.intervalEndUtc = point.timestamp;
    point.intervalStartUtc = Number.isFinite(point.intervalStartUtc)
        ? point.intervalStartUtc
        : point.timestamp - point.intervalHours * 3600000;
    point.energyKwh = Number.isFinite(point.kw) && point.kw >= 0 ? point.kw * point.intervalHours : null;
    point.kwh = point.energyKwh;
    point.qualityStatus = Number.isFinite(point.kw) && point.kw >= 0 && point.kw <= 100000 ? 'VALID' : 'INVALID';
    
    ds.version = (ds.version || 0) + 1;
    cachedAggregations = {};
    
    // Recount totals/invalids
    let total = 0;
    let invalid = 0;
    ds.data.forEach(item => {
        if (item.hasData) {
            total++;
            if (!Number.isFinite(item.kw) || item.qualityStatus === 'INVALID') invalid++;
        }
    });
    ds.totalRowsCount = total;
    ds.invalidRowsCount = invalid;
}

function updateSelectionHighlight() {
    if (!editorSelectionStart || !editorSelectionEnd) return;
    const minRow = Math.min(editorSelectionStart.row, editorSelectionEnd.row);
    const maxRow = Math.max(editorSelectionStart.row, editorSelectionEnd.row);
    const minCol = Math.min(editorSelectionStart.col, editorSelectionEnd.col);
    const maxCol = Math.max(editorSelectionStart.col, editorSelectionEnd.col);
    
    const table = document.getElementById('editor-values-table');
    if (!table) return;
    
    table.querySelectorAll('td').forEach(td => {
        if (td.dataset.row === undefined || td.dataset.col === undefined) return;
        const r = parseInt(td.dataset.row);
        const c = parseInt(td.dataset.col);
        
        const isSelected = (r >= minRow && r <= maxRow && c >= minCol && c <= maxCol);
        td.classList.toggle('cell-selected', isSelected);
        
        const isFocused = (r === editorSelectionStart.row && c === editorSelectionStart.col);
        td.classList.toggle('cell-focused', isFocused);
    });
}

function clearSelectedCells() {
    if (!editorSelectionStart || !editorSelectionEnd) return;
    const minRow = Math.min(editorSelectionStart.row, editorSelectionEnd.row);
    const maxRow = Math.max(editorSelectionStart.row, editorSelectionEnd.row);
    const minCol = Math.min(editorSelectionStart.col, editorSelectionEnd.col);
    const maxCol = Math.max(editorSelectionStart.col, editorSelectionEnd.col);
    
    const table = document.getElementById('editor-values-table');
    if (!table) return;
    
    let changed = false;
    for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
            if (c < 2) continue; // Read-only dates/times
            const cell = table.querySelector(`td[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                const dsIdx = parseInt(cell.dataset.dsIdx);
                const timestamp = parseInt(cell.dataset.timestamp);
                cell.textContent = '';
                saveCellChange(dsIdx, timestamp, null);
                changed = true;
            }
        }
    }
    
    if (changed) {
        updateDashboard();
        showToast("Ausgewählte Zellwerte gelöscht.", "info");
    }
}

function copySelectedCellsToClipboard() {
    if (!editorSelectionStart || !editorSelectionEnd) return;
    const minRow = Math.min(editorSelectionStart.row, editorSelectionEnd.row);
    const maxRow = Math.max(editorSelectionStart.row, editorSelectionEnd.row);
    const minCol = Math.min(editorSelectionStart.col, editorSelectionEnd.col);
    const maxCol = Math.max(editorSelectionStart.col, editorSelectionEnd.col);
    
    const table = document.getElementById('editor-values-table');
    if (!table) return;
    
    let lines = [];
    for (let r = minRow; r <= maxRow; r++) {
        let lineCells = [];
        for (let c = minCol; c <= maxCol; c++) {
            const cell = table.querySelector(`td[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                lineCells.push(cell.textContent.trim());
            } else {
                lineCells.push('');
            }
        }
        lines.push(lineCells.join('\t'));
    }
    
    const tsvText = lines.join('\n');
    
    // Clipboard API check (fails on file:/// in some browsers)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(tsvText).then(() => {
            showToast("Zellbereich in die Zwischenablage kopiert!", "success");
        }).catch(err => {
            fallbackCopyText(tsvText);
        });
    } else {
        fallbackCopyText(tsvText);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast("Zellbereich in die Zwischenablage kopiert!", "success");
        } else {
            showToast("Kopieren fehlgeschlagen.", "error");
        }
    } catch (err) {
        showToast("Kopieren fehlgeschlagen: " + err, "error");
    }
    document.body.removeChild(textArea);
}

function setupSpreadsheetEvents() {
    const wrapper = document.getElementById('editor-grid-wrapper');
    const table = document.getElementById('editor-values-table');
    if (!wrapper || !table) return;
    
    // Mouse drag range selection & column resizing
    table.addEventListener('mousedown', (e) => {
        const resizer = e.target.closest('.resizer');
        if (resizer) {
            e.preventDefault();
            e.stopPropagation();
            
            const th = resizer.parentElement;
            const colIdx = th.cellIndex;
            const startX = e.clientX;
            const startWidth = th.offsetWidth;
            
            resizer.classList.add('resizing');
            
            function onMouseMove(evt) {
                const width = Math.max(20, startWidth + (evt.clientX - startX));
                th.style.width = `${width}px`;
                th.style.minWidth = `${width}px`;
                
                // Store resized widths globally to keep them on re-renders
                if (colIdx === 0) {
                    widthColDatum = width;
                } else if (colIdx === 1) {
                    widthColUhrzeit = width;
                } else {
                    const dsIdx = colIdx - 2;
                    if (allDatasets[dsIdx]) {
                        allDatasets[dsIdx].width = width;
                    }
                }
                
                // Live resize the entire table width as well
                updateTableTotalWidth();
            }
            
            function onMouseUp() {
                resizer.classList.remove('resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            return;
        }

        const td = e.target.closest('td');
        if (!td || td.dataset.row === undefined || td.dataset.col === undefined) return;
        editorIsDragging = true;
        editorSelectionStart = { row: parseInt(td.dataset.row), col: parseInt(td.dataset.col) };
        editorSelectionEnd = { ...editorSelectionStart };
        updateSelectionHighlight();
        
        // Excel-like single-click edit focus and selection
        if (isEditorEditable && parseInt(td.dataset.col) >= 2) {
            setTimeout(() => {
                td.focus();
                const range = document.createRange();
                range.selectNodeContents(td);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }, 0);
        }
    });
    
    table.addEventListener('mouseover', (e) => {
        if (!editorIsDragging) return;
        const td = e.target.closest('td');
        if (!td || td.dataset.row === undefined || td.dataset.col === undefined) return;
        
        editorSelectionEnd = { row: parseInt(td.dataset.row), col: parseInt(td.dataset.col) };
        updateSelectionHighlight();
    });
    
    window.addEventListener('mouseup', () => {
        editorIsDragging = false;
    });
    
    // Save cell changes on blur
    table.addEventListener('blur', (e) => {
        const td = e.target.closest('td');
        if (!td || !td.classList.contains('editor-cell') || !isEditorEditable) return;
        
        const dsIdx = parseInt(td.dataset.dsIdx);
        const timestamp = parseInt(td.dataset.timestamp);
        const valStr = td.textContent.trim().replace(',', '.');
        const val = valStr === '' ? null : parseFloat(valStr);
        
        isSavingFromEditor = true;
        saveCellChange(dsIdx, timestamp, isNaN(val) ? null : val);
        updateDashboard();
        isSavingFromEditor = false;
    }, true);
    
    // Keyboard navigation and actions
    wrapper.addEventListener('keydown', (e) => {
        if (!editorSelectionStart) return;
        
        // Intercept copy (Ctrl+C) early if multiple cells are selected
        const isMultiCellSelection = editorSelectionEnd && 
            (editorSelectionStart.row !== editorSelectionEnd.row || editorSelectionStart.col !== editorSelectionEnd.col);
            
        if (e.key === 'c' && (e.ctrlKey || e.metaKey) && isMultiCellSelection) {
            e.preventDefault();
            copySelectedCellsToClipboard();
            return;
        }
        
        const isEditing = document.activeElement && document.activeElement.classList.contains('editor-cell');
        
        // Let standard input keys behave normally if editing inside a cell
        if (isEditing && e.key !== 'Enter' && e.key !== 'Tab' && e.key !== 'Escape') {
            return;
        }
        
        let moved = false;
        let nextRow = editorSelectionStart.row;
        let nextCol = editorSelectionStart.col;
        
        const rows = table.querySelectorAll('tbody tr');
        const maxRows = rows.length;
        const maxCols = 2 + allDatasets.length;
        
        if (e.key === 'ArrowUp') {
            if (nextRow > 0) { nextRow--; moved = true; }
        } else if (e.key === 'ArrowDown') {
            if (nextRow < maxRows - 1) { nextRow++; moved = true; }
        } else if (e.key === 'ArrowLeft') {
            if (nextCol > 0) { nextCol--; moved = true; }
        } else if (e.key === 'ArrowRight') {
            if (nextCol < maxCols - 1) { nextCol++; moved = true; }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isEditing) {
                document.activeElement.blur();
                wrapper.focus();
            }
            if (nextRow < maxRows - 1) { nextRow++; moved = true; }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (isEditing) {
                document.activeElement.blur();
                wrapper.focus();
            }
            if (e.shiftKey) {
                if (nextCol > 0) { nextCol--; moved = true; }
            } else {
                if (nextCol < maxCols - 1) { nextCol++; moved = true; }
            }
        } else if (e.key === 'Escape') {
            if (isEditing) {
                document.activeElement.blur();
                wrapper.focus();
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (!isEditorEditable) {
                showToast("Bearbeitungsmodus ist gesperrt. Bitte oben freischalten!", "warning");
                return;
            }
            e.preventDefault();
            clearSelectedCells();
        } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            copySelectedCellsToClipboard();
        }
        
        if (moved) {
            e.preventDefault();
            editorSelectionStart = { row: nextRow, col: nextCol };
            if (!e.shiftKey) {
                editorSelectionEnd = { ...editorSelectionStart };
            } else {
                editorSelectionEnd = { row: nextRow, col: nextCol };
            }
            updateSelectionHighlight();
            
            // Auto-scroll inside wrapper
            const cell = table.querySelector(`td[data-row="${nextRow}"][data-col="${nextCol}"]`);
            if (cell) {
                cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                if (isEditorEditable && nextCol >= 2) {
                    cell.focus();
                    // Select cell text
                    const range = document.createRange();
                    range.selectNodeContents(cell);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                } else {
                    wrapper.focus();
                }
            }
        }
    });
    
    // Paste handler
    wrapper.addEventListener('paste', (e) => {
        if (!isEditorEditable) {
            showToast("Bearbeitungsmodus ist gesperrt. Bitte oben freischalten!", "warning");
            e.preventDefault();
            return;
        }
        
        // 1. Read clipboard data FIRST before modifying focus
        const clipboardData = e.clipboardData || window.clipboardData;
        const text = clipboardData ? clipboardData.getData('text') : '';
        
        // 2. Defocus active editing cell to commit its changes
        const activeCell = document.activeElement;
        if (activeCell && activeCell.classList.contains('editor-cell')) {
            activeCell.blur();
        }
        
        let startRow = 0;
        let startCol = 2;
        if (activeCell && activeCell.dataset.row !== undefined && activeCell.dataset.col !== undefined) {
            startRow = parseInt(activeCell.dataset.row, 10);
            startCol = parseInt(activeCell.dataset.col, 10);
        } else if (editorSelectionStart) {
            startRow = editorSelectionStart.row;
            startCol = editorSelectionStart.col;
        } else {
            return;
        }
        
        e.preventDefault();
        if (!text) return;
        
        const pastedRows = text.split(/\r?\n/).map(line => line.split('\t'));
        // Remove trailing empty line if Excel trailing newline exists
        if (pastedRows.length > 1 && pastedRows[pastedRows.length - 1].length === 1 && pastedRows[pastedRows.length - 1][0] === "") {
            pastedRows.pop();
        }
        
        const dsCount = allDatasets.length;
        let changed = false;
        
        pastedRows.forEach((rowCells, i) => {
            const r = startRow + i;
            rowCells.forEach((valStr, j) => {
                const c = startCol + j;
                if (c < 2) return; // Date/Time columns are read-only
                
                const dsIdx = c - 2;
                if (dsIdx >= dsCount) return;
                
                let targetTs;
                if (r < pageTimestamps.length) {
                    targetTs = pageTimestamps[r];
                } else {
                    const startPageTs = pageTimestamps[0];
                    if (!startPageTs) return;
                    targetTs = startPageTs + r * 15 * 60 * 1000;
                }
                
                const val = valStr.trim().replace(',', '.');
                const parsedVal = val === '' ? null : parseFloat(val);
                
                saveCellChange(dsIdx, targetTs, isNaN(parsedVal) ? null : parsedVal);
                changed = true;
            });
        });
        
        if (changed) {
            updateDashboard();
            loadTableValuesToEditor();
            showToast("Werte erfolgreich aus Zwischenablage eingefügt!", "success");
        }
    });

    // --- Safety Lock toggler button listener ---
    const btnToggleLock = document.getElementById('btn-editor-toggle-lock');
    const cancelBtn = document.getElementById('btn-editor-cancel-edit');
    if (btnToggleLock) {
        // Clear active listeners before replacing
        btnToggleLock.replaceWith(btnToggleLock.cloneNode(true));
        const newLockBtn = document.getElementById('btn-editor-toggle-lock');
        
        newLockBtn.addEventListener('click', () => {
            isEditorEditable = !isEditorEditable;
            
            const lockIcon = document.getElementById('editor-lock-icon');
            const lockText = document.getElementById('editor-lock-text');
            
            if (isEditorEditable) {
                // Save Backup of current datasets before edit session starts
                datasetsBackup = allDatasets.map(ds => ({
                    name: ds.name,
                    version: ds.version,
                    data: JSON.parse(JSON.stringify(ds.data))
                }));
                
                if (cancelBtn) cancelBtn.style.display = 'inline-flex';
                
                newLockBtn.style.borderColor = 'var(--primary-color)';
                newLockBtn.style.backgroundColor = 'rgba(0, 180, 230, 0.1)';
                if (lockIcon) {
                    lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
                }
                if (lockText) lockText.textContent = "Speichern & Sperren";
                showToast("Bearbeitungsmodus AKTIVIERT. Du kannst nun Werte ändern, einfügen und löschen.", "info");
            } else {
                if (cancelBtn) cancelBtn.style.display = 'none';
                datasetsBackup = null;
                
                newLockBtn.style.borderColor = 'var(--border-color)';
                newLockBtn.style.backgroundColor = '';
                if (lockIcon) {
                    lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
                }
                if (lockText) lockText.textContent = "Bearbeiten freischalten";
                showToast("Bearbeitungsmodus DEAKTIVIERT. Daten sind gespeichert.", "success");
            }
            
            loadTableValuesToEditor();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (!datasetsBackup) return;
            
            // Restore datasets from backup
            datasetsBackup.forEach((backupDs, idx) => {
                if (allDatasets[idx]) {
                    allDatasets[idx].name = backupDs.name;
                    allDatasets[idx].version = backupDs.version;
                    allDatasets[idx].data = backupDs.data.map(d => ({
                        ...d,
                        dateObj: Number.isFinite(d.timestamp) ? new Date(d.timestamp) : null
                    }));
                }
            });
            
            isEditorEditable = false;
            if (cancelBtn) cancelBtn.style.display = 'none';
            datasetsBackup = null;
            
            const lockIcon = document.getElementById('editor-lock-icon');
            const lockText = document.getElementById('editor-lock-text');
            const toggleLockBtn = document.getElementById('btn-editor-toggle-lock');
            
            if (toggleLockBtn) {
                toggleLockBtn.style.borderColor = 'var(--border-color)';
                toggleLockBtn.style.backgroundColor = '';
            }
            if (lockIcon) {
                lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
            }
            if (lockText) lockText.textContent = "Bearbeiten freischalten";
            
            cachedAggregations = {};
            updateDashboard();
            loadTableValuesToEditor();
            showToast("Änderungen verworfen.", "info");
        });
    }

    // --- Gehe zu Datum input listener ---
    const jumpDateInput = document.getElementById('editor-jump-date');
    if (jumpDateInput) {
        jumpDateInput.addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) return;
            
            const targetDate = new Date(val + "T00:00:00");
            const targetMs = targetDate.getTime();
            
            const index = allTimestampsInSelectedRange.findIndex(ts => ts >= targetMs);
            if (index !== -1) {
                editorTablePage = Math.floor(index / editorGridPageSize);
                loadTableValuesToEditor();
                showToast(`Zu Datum ${targetDate.toLocaleDateString('de-DE')} gesprungen.`, "info");
            } else {
                showToast("Datum liegt außerhalb des geladenen Zeitraums.", "warning");
            }
        });
    }

    // --- Lastgang hinzufügen button listener ---
    const btnAddChannel = document.getElementById('btn-editor-add-channel');
    if (btnAddChannel) {
        btnAddChannel.addEventListener('click', () => {
            let year = 2026;
            if (allDatasets.length > 0 && allDatasets[0].data.length > 0) {
                year = allDatasets[0].data[0].dateObj.getFullYear();
            }
            
            const name = `Lastgang ${allDatasets.length + 1}`;
            const newDs = createEmptyDataset(name, year);
            allDatasets.push(newDs);
            
            if (typeof renderDatasetCheckboxes === 'function') {
                renderDatasetCheckboxes(true);
            }
            
            cachedAggregations = {};
            updateDashboard();
            loadTableValuesToEditor();
            showToast(`Neuer Lastgang "${name}" hinzugefügt.`, "success");
        });
    }

    // --- Mass Copy & Paste Modal Event Listeners ---
    const btnMassCopyPaste = document.getElementById('btn-editor-mass-copy-paste');
    const massModal = document.getElementById('mass-copy-paste-modal');
    const btnMassClose = document.getElementById('btn-mass-modal-close');
    const btnMassCopy = document.getElementById('btn-mass-modal-copy');
    const btnMassConfirm = document.getElementById('btn-mass-modal-confirm');
    const massTextarea = document.getElementById('mass-modal-textarea');
    const massImportOptions = document.getElementById('mass-modal-import-options');
    const massTargetSelect = document.getElementById('mass-modal-target-col');
    const massTitle = document.getElementById('mass-modal-title');
    const massDesc = document.getElementById('mass-modal-desc');
    const btnMassUploadTrigger = document.getElementById('btn-mass-modal-upload-trigger');
    const massFileInput = document.getElementById('mass-modal-file-input');
    const btnMassDownload = document.getElementById('btn-mass-modal-download');
    const btnMassClear = document.getElementById('btn-mass-modal-clear');

    if (btnMassCopyPaste && massModal) {
        btnMassCopyPaste.addEventListener('click', () => {
            massTitle.textContent = "Massen-Import / Export (Excel / CSV)";
            massDesc.textContent = "Kopiere die rohen Daten des gewählten Zeitraums (Export) oder füge neue Tabellendaten ein, um einen neuen Lastgang zu generieren (Import).";
            btnMassConfirm.style.display = 'inline-flex';
            massTextarea.removeAttribute('readonly');

            // Generate Export TSV string
            let exportLines = [];
            exportLines.push(['Datum', 'Uhrzeit'].concat(allDatasets.map(ds => ds.name)).join('\t'));

            const datasetMaps = allDatasets.map(ds => {
                const map = new Map();
                ds.data.forEach(d => map.set(d.timestamp, d));
                return map;
            });

            allTimestampsInSelectedRange.forEach(timestamp => {
                const dateObj = new Date(timestamp);
                let dateStr = '';
                let timeStr = '';
                if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
                    const prevDate = new Date(timestamp - 15 * 60 * 1000);
                    dateStr = getLocalDateString(prevDate).split('-').reverse().join('.');
                    timeStr = '24:00';
                } else {
                    dateStr = getLocalDateString(dateObj).split('-').reverse().join('.');
                    timeStr = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                }

                const rowVals = allDatasets.map((ds, c) => {
                    const p = datasetMaps[c].get(timestamp);
                    if (p && Number.isFinite(p.kw)) {
                        const energy = typeof getMeasurementEnergyKwh === 'function' ? getMeasurementEnergyKwh(p) : p.kw * 0.25;
                        return displayUnit === 'kwh' ? (energy === null ? '' : energy.toFixed(2)) : p.kw.toFixed(2);
                    }
                    return '';
                });

                exportLines.push([dateStr, timeStr].concat(rowVals).join('\t'));
            });

            massTextarea.value = exportLines.join('\n');
            massModal.classList.remove('hidden');
        });

        // Close Modal
        const closeModal = () => massModal.classList.add('hidden');
        btnMassClose.addEventListener('click', closeModal);
        massModal.addEventListener('click', (e) => {
            if (e.target === massModal) closeModal();
        });

        // Copy Text to Clipboard
        btnMassCopy.addEventListener('click', () => {
            massTextarea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    showToast("Rohdaten in die Zwischenablage kopiert!", "success");
                } else {
                    showToast("Kopieren fehlgeschlagen.", "error");
                }
            } catch (err) {
                showToast("Kopieren fehlgeschlagen: " + err, "error");
            }
        });

        // Clear Textarea content
        if (btnMassClear) {
            btnMassClear.addEventListener('click', () => {
                massTextarea.value = '';
                showToast("Textfeld geleert.", "info");
            });
        }

        // Download Text as CSV File
        if (btnMassDownload) {
            btnMassDownload.addEventListener('click', () => {
                const rawText = massTextarea.value;
                if (!rawText.trim()) return;
                
                const blob = new Blob([rawText], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                
                const startStr = getLocalDateString(globalDateRange.start).replace(/-/g, '');
                const endStr = getLocalDateString(globalDateRange.end).replace(/-/g, '');
                link.setAttribute("href", url);
                link.setAttribute("download", `Lastgang_Export_${startStr}_to_${endStr}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast("CSV-Datei erfolgreich exportiert!", "success");
            });
        }

        // Read Local CSV File
        if (btnMassUploadTrigger && massFileInput) {
            btnMassUploadTrigger.addEventListener('click', () => {
                massFileInput.value = '';
                massFileInput.click();
            });

            massFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(evt) {
                    massTextarea.value = evt.target.result;
                    showToast(`Datei "${file.name}" erfolgreich eingelesen! Klicke auf 'Daten importieren' zum Übernehmen.`, "success");
                };
                reader.readAsText(file);
            });
        }

        // Import Text into new columns
        btnMassConfirm.addEventListener('click', () => {
            const rawText = massTextarea.value;
            if (!rawText.trim()) {
                showToast("Bitte füge zuerst Daten in das Textfeld ein.", "warning");
                return;
            }

            const rawLines = rawText.split(/\r?\n/).filter(line => line.trim() !== '');
            if (rawLines.length === 0) {
                showToast("Das Textfeld ist leer.", "warning");
                return;
            }

            // Auto-detect CSV separator based on the first line
            const firstLine = rawLines[0];
            let separator = '\t';
            const tabCount = (firstLine.match(/\t/g) || []).length;
            const semiCount = (firstLine.match(/;/g) || []).length;
            const commaCount = (firstLine.match(/,/g) || []).length;
            
            if (semiCount > tabCount && semiCount > commaCount) separator = ';';
            else if (commaCount > tabCount && commaCount > semiCount) separator = ',';

            const lines = rawLines.map(line => line.split(separator));
            
            // Check if there is a header line and extract column names
            let colNames = [];
            let startLineIdx = 0;
            if (lines.length > 0) {
                const col0 = lines[0][0] ? lines[0][0].toLowerCase().trim() : '';
                if (col0.includes('datum') || col0.includes('date')) {
                    colNames = lines[0].slice(2).map(n => n.trim() || 'Importierte Spalte');
                    startLineIdx = 1;
                }
            }

            // If no headers found, default to column count
            const numValueCols = Math.max(1, lines[startLineIdx] ? lines[startLineIdx].length - 2 : 1);
            if (colNames.length === 0) {
                for (let c = 0; c < numValueCols; c++) {
                    colNames.push(`Importierter Lastgang ${allDatasets.length + c + 1}`);
                }
            }

            // Create new datasets
            const newDatasetsList = colNames.map(name => ({
                name: name,
                data: [],
                totalRowsCount: 0,
                invalidRowsCount: 0,
                importedUnit: 'kw'
            }));

            function parseDateTimeToTimestamp(dateStr, timeStr) {
                const dParts = dateStr.trim().split(/[-./]/);
                const hParts = timeStr.trim().split(':');
                if (dParts.length !== 3 || hParts.length < 2) return null;
                
                let y = 2000, m = 1, d = 1;
                if (dParts[0].length === 4) {
                    y = parseInt(dParts[0], 10);
                    m = parseInt(dParts[1], 10);
                    d = parseInt(dParts[2], 10);
                } else {
                    d = parseInt(dParts[0], 10);
                    m = parseInt(dParts[1], 10);
                    y = parseInt(dParts[2], 10);
                    if (y < 100) y += 2000;
                }
                
                let ts = new Date(y, m - 1, d, parseInt(hParts[0] || 0, 10), parseInt(hParts[1] || 0, 10));
                if (timeStr.trim() === "24:00") {
                    ts = new Date(y, m - 1, d);
                    ts.setDate(ts.getDate() + 1);
                }
                return ts.getTime();
            }

            isSavingFromEditor = true;

            for (let i = startLineIdx; i < lines.length; i++) {
                const cols = lines[i];
                if (cols.length < 3) continue; // Needs Date, Time, and at least one Value column

                const dateStr = cols[0];
                const timeStr = cols[1];
                const timestamp = parseDateTimeToTimestamp(dateStr, timeStr);
                if (!timestamp) continue;

                const dObj = new Date(timestamp);

                newDatasetsList.forEach((newDs, idx) => {
                    // Grab value for this dataset index, or fall back to column 2 if single-column paste
                    let valIdx = 2;
                    if (cols.length > 2 + idx) {
                        valIdx = 2 + idx;
                    }

                    const rawVal = cols[valIdx];
                    if (rawVal === undefined) return;

                    const valClean = rawVal.trim().replace(',', '.');
                    const parsedVal = valClean === '' ? null : parseFloat(valClean);

                    newDs.data.push({
                        timestamp: timestamp,
                        intervalHours: 0.25,
                        intervalStartUtc: timestamp - 15 * 60 * 1000,
                        intervalEndUtc: timestamp,
                        dateStr: getLocalDateString(dObj).split('-').reverse().join('.'),
                        timeStr: dObj.getHours() === 0 && dObj.getMinutes() === 0 ? '24:00' : dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                        dateObj: dObj,
                        kw: isNaN(parsedVal) ? null : parsedVal,
                        energyKwh: isNaN(parsedVal) || parsedVal < 0 ? null : parsedVal * 0.25,
                        kwh: isNaN(parsedVal) || parsedVal < 0 ? null : parsedVal * 0.25,
                        qualityStatus: !isNaN(parsedVal) && parsedVal >= 0 && parsedVal <= 100000 ? 'VALID' : 'INVALID',
                        rawKw: isNaN(parsedVal) ? null : parsedVal,
                        hasData: true
                    });
                });
            }

            // Sort and finalize all newly created datasets
            let importedCount = 0;
            newDatasetsList.forEach(newDs => {
                if (newDs.data.length > 0) {
                    newDs.data.sort((a, b) => a.timestamp - b.timestamp);
                    newDs.totalRowsCount = newDs.data.length;
                    newDs.invalidRowsCount = newDs.data.filter(d => !Number.isFinite(d.kw) || d.qualityStatus === 'INVALID').length;
                    allDatasets.push(newDs);
                    importedCount++;
                }
            });

            isSavingFromEditor = false;

            if (importedCount > 0) {
                // Activate the newly imported channels in the view
                activeDatasetIds = allDatasets.map((_, idx) => idx);
                if (typeof renderDatasetCheckboxes === 'function') {
                    renderDatasetCheckboxes(true);
                }
                updateDashboard();
                loadTableValuesToEditor();
                closeModal();
                showToast(`${importedCount} neue Lastgänge erfolgreich importiert!`, "success");
            } else {
                showToast("Es konnten keine gültigen Datenpunkte importiert werden. Bitte prüfe das Format (Datum;Uhrzeit;Wert).", "error");
            }
        });
    }
}

function setupHolidayEvents() {
    const btnOpen = document.getElementById('btn-open-holiday-manager');
    const modal = document.getElementById('modal-holiday-manager');
    const btnClose = document.getElementById('btn-close-holiday-modal');
    const btnCancel = document.getElementById('btn-cancel-holidays');
    const btnSave = document.getElementById('btn-save-holidays');
    const btnReset = document.getElementById('btn-reset-holidays');
    const selectState = document.getElementById('select-holiday-state');
    const holidayListContainer = document.getElementById('holiday-list-container');
    
    const inputName = document.getElementById('input-custom-holiday-name');
    const selectType = document.getElementById('select-custom-holiday-type');
    const btnAdd = document.getElementById('btn-add-custom-holiday');
    
    const divFixed = document.getElementById('custom-holiday-fixed-inputs');
    const divEaster = document.getElementById('custom-holiday-easter-inputs');
    const divSpecific = document.getElementById('custom-holiday-specific-inputs');
    
    // Temporary working state for the modal
    let tempHolidayConfig = { state: "NW", customHolidays: [] };
    
    if (!modal) return;
    
    // Toggle input visibility based on type
    selectType.addEventListener('change', () => {
        const type = selectType.value;
        divFixed.style.display = type === 'fixed' ? 'flex' : 'none';
        divEaster.style.display = type === 'easter' ? 'flex' : 'none';
        divSpecific.style.display = type === 'specific' ? 'flex' : 'none';
    });
    
    // Render holidays list in modal
    function renderModalHolidays() {
        holidayListContainer.innerHTML = '';
        
        // Use a mock/default year to show what the active holidays look like
        const currentYear = new Date().getFullYear();
        
        // Generate active holidays for the modal view using temp config
        const official = getOfficialHolidaysForState(tempHolidayConfig.state, currentYear);
        const listItems = [];
        
        // Add official ones
        Object.keys(official).forEach(dateStr => {
            listItems.push({
                dateStr,
                name: official[dateStr],
                isCustom: false
            });
        });
        
        // Add custom ones
        tempHolidayConfig.customHolidays.forEach(h => {
            if (h.type === 'fixed') {
                const mStr = String(h.fixedMonth).padStart(2, '0');
                const dStr = String(h.fixedDay).padStart(2, '0');
                listItems.push({
                    dateStr: `${currentYear}-${mStr}-${dStr}`,
                    name: h.name,
                    isCustom: true,
                    raw: h
                });
            } else if (h.type === 'easter') {
                const easter = getEasterSunday(currentYear);
                const d = new Date(easter.getTime());
                d.setDate(d.getDate() + parseInt(h.easterOffset, 10));
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dayStr = String(d.getDate()).padStart(2, '0');
                listItems.push({
                    dateStr: `${y}-${m}-${dayStr}`,
                    name: h.name,
                    isCustom: true,
                    raw: h
                });
            } else if (h.type === 'specific') {
                listItems.push({
                    dateStr: h.specificDate,
                    name: h.name,
                    isCustom: true,
                    raw: h
                });
            }
        });
        
        // Sort chronologically
        listItems.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
        
        if (listItems.length === 0) {
            holidayListContainer.innerHTML = '<div style="color: var(--text-muted); font-style: italic; text-align: center; padding: 1rem 0;">Keine Feiertage definiert</div>';
            return;
        }
        
        listItems.forEach(item => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '0.25rem 0.4rem';
            row.style.borderRadius = 'var(--radius-sm)';
            row.style.background = item.isCustom ? 'rgba(0, 180, 230, 0.08)' : 'transparent';
            row.style.border = item.isCustom ? '1px solid rgba(0, 180, 230, 0.2)' : 'none';
            row.style.fontSize = '0.75rem';
            row.style.marginBottom = '2px';
            
            // Format date for German representation
            let dateLabel = '';
            try {
                const parts = item.dateStr.split('-');
                dateLabel = `${parts[2]}.${parts[1]}.`;
            } catch (e) {
                dateLabel = item.dateStr;
            }
            
            const infoSpan = document.createElement('span');
            infoSpan.innerHTML = `<strong style="color: var(--text-muted); margin-right: 0.5rem;">${dateLabel}</strong> <span style="color: var(--text-color);">${escapeHtml(item.name)}</span>`;
            if (item.isCustom) {
                infoSpan.innerHTML += ' <span style="font-size: 0.65rem; padding: 1px 4px; border-radius: 4px; background: var(--primary-color); color: #0f172a; font-weight: bold; margin-left: 0.35rem;">Eigener</span>';
            }
            row.appendChild(infoSpan);
            
            if (item.isCustom) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.style.background = 'transparent';
                delBtn.style.border = 'none';
                delBtn.style.color = 'var(--error-color)';
                delBtn.style.cursor = 'pointer';
                delBtn.style.padding = '2px';
                delBtn.style.display = 'flex';
                delBtn.style.alignItems = 'center';
                delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                
                delBtn.addEventListener('click', () => {
                    tempHolidayConfig.customHolidays = tempHolidayConfig.customHolidays.filter(ch => ch !== item.raw);
                    renderModalHolidays();
                });
                
                row.appendChild(delBtn);
            }
            
            holidayListContainer.appendChild(row);
        });
    }
    
    // Open modal
    if (btnOpen) {
        btnOpen.addEventListener('click', () => {
            // Clone the global holiday config
            tempHolidayConfig = JSON.parse(JSON.stringify(holidayConfig));
            selectState.value = tempHolidayConfig.state || "NW";
            
            // Clear inputs
            inputName.value = '';
            document.getElementById('input-custom-holiday-day').value = '';
            document.getElementById('input-custom-holiday-easter-offset').value = '';
            document.getElementById('input-custom-holiday-specific-date').value = '';
            
            // Trigger layout initial state
            divFixed.style.display = 'flex';
            divEaster.style.display = 'none';
            divSpecific.style.display = 'none';
            selectType.value = 'fixed';
            
            renderModalHolidays();
            modal.classList.remove('hidden');
        });
    }
    
    // State Selection Change
    selectState.addEventListener('change', () => {
        tempHolidayConfig.state = selectState.value;
        renderModalHolidays();
    });
    
    // Add custom holiday
    btnAdd.addEventListener('click', () => {
        const name = inputName.value.trim();
        if (!name) {
            showToast("Bitte gib einen Namen für den Feiertag ein.", "warning");
            return;
        }
        
        const type = selectType.value;
        const newHoliday = {
            id: String(Date.now()),
            name: name,
            type: type
        };
        
        if (type === 'fixed') {
            const day = parseInt(document.getElementById('input-custom-holiday-day').value, 10);
            const month = parseInt(document.getElementById('select-custom-holiday-month').value, 10);
            const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
            if (isNaN(day) || day < 1 || day > maxDays[month - 1]) {
                showToast(`Bitte gib einen gültigen Tag für den Monat ${monthNames[month - 1]} (1-${maxDays[month - 1]}) ein.`, "warning");
                return;
            }
            newHoliday.fixedDay = day;
            newHoliday.fixedMonth = month;
        } else if (type === 'easter') {
            const offset = parseInt(document.getElementById('input-custom-holiday-easter-offset').value, 10);
            if (isNaN(offset)) {
                showToast("Bitte gib einen gültigen Offset in Tagen ein.", "warning");
                return;
            }
            newHoliday.easterOffset = offset;
        } else if (type === 'specific') {
            const dateVal = document.getElementById('input-custom-holiday-specific-date').value;
            if (!dateVal) {
                showToast("Bitte wähle ein Datum aus.", "warning");
                return;
            }
            newHoliday.specificDate = dateVal;
        }
        
        tempHolidayConfig.customHolidays.push(newHoliday);
        inputName.value = '';
        document.getElementById('input-custom-holiday-day').value = '';
        document.getElementById('input-custom-holiday-easter-offset').value = '';
        document.getElementById('input-custom-holiday-specific-date').value = '';
        renderModalHolidays();
        showToast("Feiertag hinzugefügt!", "success");
    });
    
    // Close modal handlers
    const closeModal = () => {
        modal.classList.add('hidden');
    };
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    
    // Reset to defaults
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            tempHolidayConfig = {
                state: "NW",
                customHolidays: []
            };
            selectState.value = "NW";
            renderModalHolidays();
            showToast("Zurückgesetzt auf NRW-Standard.", "info");
        });
    }
    
    // Save holidays
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            holidayConfig = tempHolidayConfig;
            saveHolidayConfig();
            
            // Clear ECharts aggregations cache
            cachedAggregations = {};
            
            // Recompute everything
            updateDashboard();
            
            closeModal();
            showToast("Feiertagseinstellungen erfolgreich gespeichert!", "success");
        });
    }
}

function updateProfileFilterGroupHighlights(mode) {
    const daysGroup = document.getElementById('profile-days-group');
    const quartersGroup = document.getElementById('profile-quarters-group');
    
    if (daysGroup) {
        const badge = daysGroup.querySelector('.group-badge');
        if (mode === 'days') {
            daysGroup.classList.add('is-comparison');
            if (badge) badge.textContent = 'Vergleich';
        } else {
            daysGroup.classList.remove('is-comparison');
            if (badge) badge.textContent = 'Filter';
        }
    }
    
    if (quartersGroup) {
        const badge = quartersGroup.querySelector('.group-badge');
        if (mode === 'quarters') {
            quartersGroup.classList.add('is-comparison');
            if (badge) badge.textContent = 'Vergleich';
        } else {
            quartersGroup.classList.remove('is-comparison');
            if (badge) badge.textContent = 'Filter';
        }
    }
}

// --- Capacity scenario beta: calculation and rendering ---
function updateAgnesOptimization(activeFilteredDatasets) {
    if (!activeDatasetIds || activeDatasetIds.length === 0 || !allDatasets) return;
    
    // Manage dataset dropdown selector in AgNes header
    const selectAgnesDs = document.getElementById('select-agnes-dataset');
    const badgeEl = document.getElementById('agnes-info-count-badge');
    let selectedDsId = activeDatasetIds[0];

    if (selectAgnesDs) {
        const activeDsList = activeDatasetIds
            .filter(id => allDatasets[id])
            .map(id => ({ id: id, name: allDatasets[id].name }));
        
        const currentSelVal = parseInt(selectAgnesDs.value, 10);
        const isValidSel = !isNaN(currentSelVal) && activeDsList.some(item => item.id === currentSelVal);

        selectedDsId = isValidSel ? currentSelVal : activeDsList[0].id;

        selectAgnesDs.innerHTML = activeDsList.map(item =>
            `<option value="${item.id}" ${item.id === selectedDsId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`
        ).join('');
        selectAgnesDs.value = selectedDsId;

        if (badgeEl) {
            badgeEl.textContent = activeDsList.length > 1 ? `(${activeDsList.length} aktiv)` : '';
        }
    }

    const fullDataset = allDatasets[selectedDsId] || allDatasets[activeDatasetIds[0]];
    const filteredForDs = getFilteredData(selectedDsId);
    const activeData = (filteredForDs && filteredForDs.length > 0) ? filteredForDs : (fullDataset?.data || []);
    const activeDataset = { id: selectedDsId, name: fullDataset?.name || '', data: activeData };

    let uniqueYearsCount = 0;
    const datasetYears = new Set();
    if (fullDataset && fullDataset.data) {
        fullDataset.data.forEach(d => {
            if (d.dateObj) datasetYears.add(d.dateObj.getFullYear());
        });
        uniqueYearsCount = datasetYears.size;
    }

    // Enable/disable mode switcher based on unique years in the active dataset
    const btnAgnesSingle = document.getElementById('btn-agnes-mode-single');
    const btnAgnesMulti = document.getElementById('btn-agnes-mode-multi');

    if (btnAgnesSingle && btnAgnesMulti) {
        if (uniqueYearsCount < 2) {
            btnAgnesMulti.disabled = true;
            btnAgnesMulti.title = "Der ausgewählte Lastgang muss Daten für mindestens 2 Kalenderjahre enthalten.";
            currentAgnesMode = 'single';
            btnAgnesSingle.classList.add('active');
            btnAgnesMulti.classList.remove('active');
        } else {
            btnAgnesMulti.disabled = false;
            btnAgnesMulti.title = "Mehrjährige Optimierung durchführen";
            if (!currentAgnesMode) {
                currentAgnesMode = 'multi';
            }
            btnAgnesSingle.classList.toggle('active', currentAgnesMode === 'single');
            btnAgnesMulti.classList.toggle('active', currentAgnesMode === 'multi');
        }
    }

    const lblIndividualYears = document.getElementById('lbl-agnes-show-individual-years');
    if (lblIndividualYears) {
        lblIndividualYears.style.display = (currentAgnesMode === 'multi') ? 'flex' : 'none';
    }

    const nameEl = document.getElementById('agnes-info-lastgang-name');
    const modeEl = document.getElementById('agnes-info-mode');
    const zeitraumEl = document.getElementById('agnes-info-zeitraum');

    if (activeDataset) {
        if (nameEl) {
            nameEl.textContent = activeDataset.name || '-';
            nameEl.title = activeDataset.name || '';
        }

        let minD = null;
        let maxD = null;
        if (activeDataset.data && activeDataset.data.length > 0) {
            minD = activeDataset.data[0].dateObj;
            maxD = activeDataset.data[activeDataset.data.length - 1].dateObj;
        }

        const sortedYears = Array.from(datasetYears).sort((a, b) => a - b);

        if (modeEl) {
            if (currentAgnesMode === 'multi' && sortedYears.length > 0) {
                const yearRange = sortedYears.length > 1 ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : sortedYears[0];
                modeEl.textContent = `Mehrjährig (${yearRange})`;
            } else if (sortedYears.length > 0) {
                modeEl.textContent = `Einzeljahr (${sortedYears[0]})`;
            } else {
                modeEl.textContent = currentAgnesMode === 'multi' ? 'Mehrjährig' : 'Einzeljahr';
            }
            modeEl.style.fontWeight = '600';
            modeEl.style.color = currentAgnesMode === 'multi' ? 'var(--primary-color)' : 'var(--text-main)';
        }

        if (minD && maxD) {
            const durationMs = maxD.getTime() - minD.getTime() + 15 * 60 * 1000;
            const days = Math.round(durationMs / (1000 * 60 * 60 * 24));
            
            if (zeitraumEl) {
                zeitraumEl.textContent = `${minD.toLocaleDateString('de-DE')} bis ${maxD.toLocaleDateString('de-DE')} (${days} Tage)`;
            }
        } else {
            if (zeitraumEl) zeitraumEl.textContent = '-';
        }
    }

    // 1. Get parameters from UI
    let kp = parseFloat(document.getElementById('input-agnes-kp')?.value || 50.00);
    let ap1 = parseFloat(document.getElementById('input-agnes-ap1')?.value || 1.50);
    let ap2 = parseFloat(document.getElementById('input-agnes-ap2')?.value || 4.50);

    let isInputCorrected = false;
    if (isNaN(kp) || kp < 0) { kp = 0; isInputCorrected = true; }
    if (isNaN(ap1) || ap1 < 0) { ap1 = 0; isInputCorrected = true; }
    if (isNaN(ap2) || ap2 < ap1) { ap2 = ap1; isInputCorrected = true; }

    if (isInputCorrected) {
        const kpEl = document.getElementById('input-agnes-kp');
        const ap1El = document.getElementById('input-agnes-ap1');
        const ap2El = document.getElementById('input-agnes-ap2');
        if (kpEl && (isNaN(parseFloat(kpEl.value)) || parseFloat(kpEl.value) < 0)) kpEl.value = kp.toFixed(2);
        if (ap1El && (isNaN(parseFloat(ap1El.value)) || parseFloat(ap1El.value) < 0)) ap1El.value = ap1.toFixed(2);
        if (ap2El && (isNaN(parseFloat(ap2El.value)) || parseFloat(ap2El.value) < ap1)) {
            ap2El.value = ap2.toFixed(2);
            showToast('Arbeitspreis AP 2 (Überlast) darf nicht günstiger als AP 1 sein. Auf AP 1 korrigiert.', 'warning');
        }
    }

    // Calculate clean pMax to determine the 10% threshold in kW
    let pMaxClean = 0;
    if (currentAgnesMode === 'multi') {
        // The AgNes selector defines the optimized load profile. Do not let
        // unrelated active chart series change its statutory minimum.
        const selectedPeakData = activeDataset?.data || [];
        selectedPeakData.forEach(d => {
            if (!Number.isFinite(d.kw) || d.kw < 0 || d.kw > 100000) return;
            if (d.kw > pMaxClean) pMaxClean = d.kw;
        });
    } else {
        const dataset = activeDataset;
        dataset.data.forEach(d => {
            if (!Number.isFinite(d.kw) || d.kw < 0 || d.kw > 100000) return;
            if (d.kw > pMaxClean) pMaxClean = d.kw;
        });
    }

    const minAllowedKw = Math.ceil(pMaxClean * 0.1);
    const inputMinKw = document.getElementById('input-agnes-min-kw');
    let minPercent = 0.1; // default fallback

    if (inputMinKw && pMaxClean > 0) {
        inputMinKw.min = minAllowedKw;
        
        let enteredVal = inputMinKw.value !== "" ? parseFloat(inputMinKw.value) : NaN;
        let simulationVal;
        
        if (isNaN(enteredVal)) {
            simulationVal = Math.round(pMaxClean * 0.2);
            inputMinKw.value = simulationVal;
        } else {
            simulationVal = Math.max(Math.round(enteredVal), minAllowedKw);
        }
        
        minPercent = simulationVal / pMaxClean;
        const badge = document.getElementById('agnes-min-kw-percent-badge');
        if (badge) {
            badge.textContent = `(${(minPercent * 100).toFixed(0)}% der Peaklast)`;
        }
    }

    // Toggle Risiko-Matrix tab button based on current mode
    const breakdownTabBtn = document.getElementById('tab-btn-agnes-breakdown');
    if (currentAgnesMode === 'single') {
        if (breakdownTabBtn) breakdownTabBtn.style.display = 'none';
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.dataset.target === 'tab-agnes-breakdown') {
            const defaultBtn = document.querySelector('.tab-btn[data-target="tab-agnes-charts"]');
            if (defaultBtn) defaultBtn.click();
        }
    } else {
        if (breakdownTabBtn) breakdownTabBtn.style.display = '';
    }

    // Warnings and layout references
    const warningEl = document.getElementById('agnes-timeframe-warning');
    const warningShortEl = document.getElementById('agnes-timeframe-short-warning');
    const warningDaysEl = document.getElementById('agnes-warning-days');
    const warningShortDaysEl = document.getElementById('agnes-warning-short-days');
    const contentEl = document.getElementById('tab-agnes-content');
    const tabScenarios = document.getElementById('tab-agnes-scenarios');
    const tabBreakdown = document.getElementById('tab-agnes-breakdown');

    let elapsedDays = 0;
    if (currentAgnesMode === 'single') {
        const dataset = activeDataset;
        const data = dataset.data;
        const minDate = data[0].dateObj;
        const maxDate = data[data.length - 1].dateObj;
        const durationMs = maxDate.getTime() - minDate.getTime() + 15 * 60 * 1000;
        elapsedDays = durationMs / (1000 * 60 * 60 * 24);

        if (elapsedDays > 366.5) {
            if (warningEl) warningEl.classList.remove('hidden');
            if (warningShortEl) warningShortEl.classList.add('hidden');
            if (contentEl) contentEl.style.display = 'none';
            if (tabScenarios) tabScenarios.style.display = 'none';
            if (tabBreakdown) tabBreakdown.style.display = 'none';
            if (warningDaysEl) warningDaysEl.textContent = Math.ceil(elapsedDays);
            return;
        } else if (elapsedDays < 30.0) {
            if (warningEl) warningEl.classList.add('hidden');
            if (warningShortEl) warningShortEl.classList.remove('hidden');
            if (contentEl) contentEl.style.display = 'none';
            if (tabScenarios) tabScenarios.style.display = 'none';
            if (tabBreakdown) tabBreakdown.style.display = 'none';
            if (warningShortDaysEl) warningShortDaysEl.textContent = Math.ceil(elapsedDays);
            return;
        }
    }

    // Always show content in multi-year mode or if single-year passes check
    if (warningEl) warningEl.classList.add('hidden');
    if (warningShortEl) warningShortEl.classList.add('hidden');
    if (contentEl) contentEl.style.display = 'flex';
    if (tabScenarios) tabScenarios.style.display = '';
    if (tabBreakdown) tabBreakdown.style.display = '';

    // 4. Quality Banner and Warnings
    const qualityAlertEl = document.getElementById('agnes-quality-alert');
    const qualityAlertTextEl = document.getElementById('agnes-quality-alert-text');
    
    if (qualityAlertEl && qualityAlertTextEl) {
        const alerts = [];
        
        // Multi-year or single year check
        const datasetsToCheck = currentAgnesMode === 'multi' ? [activeDataset] : [activeDataset];
        
        datasetsToCheck.forEach(ds => {
            const data = ds.data;
            const minDate = data[0].dateObj;
            const maxDate = data[data.length - 1].dateObj;
            const durationMs = maxDate.getTime() - minDate.getTime() + 15 * 60 * 1000;
            const dsDays = durationMs / (1000 * 60 * 60 * 24);

            if (currentAgnesMode === 'multi' && dsDays < 350.0) {
                alerts.push(`<strong>Unvollständiger Lastgang (${escapeHtml(ds.name)}):</strong> Enthält nur ${Math.ceil(dsDays)} Tage. Unvollständige Kalenderjahre verzerren die Jahreshöchstlast und die daraus abgeleitete Modell-Untergrenze. Dies kann die Mehrjahres-Simulation verfälschen.`);
            } else if (currentAgnesMode === 'single' && dsDays < 350.0) {
                alerts.push(`<strong>Kurzer Zeitraum (${escapeHtml(ds.name)}):</strong> Hochrechnung auf Basis von nur ${Math.ceil(dsDays)} Tagen. Die Aussagekraft ist gegenüber einem vollständigen Kalenderjahr eingeschränkt.`);
            }
            
            let missingPoints = 0;
            const stepMs = 15 * 60 * 1000;
            const toleranceMs = 60 * 1000;
            for (let i = 1; i < data.length; i++) {
                const diff = data[i].timestamp - data[i - 1].timestamp;
                if (diff > stepMs + toleranceMs) {
                    missingPoints += Math.max(0, Math.round(diff / stepMs) - 1);
                }
            }
            
            let duplicatePoints = 0;
            const seenTs = new Set();
            let negativePoints = 0;
            let spikePoints = 0;
            
            data.forEach(d => {
                if (!Number.isFinite(d.kw)) {
                    negativePoints++;
                    return;
                }
                if (d.kw < 0) negativePoints++;
                if (d.kw > 100000) spikePoints++;
                if (Number.isFinite(d.timestamp)) {
                    if (seenTs.has(d.timestamp)) {
                        duplicatePoints++;
                    } else {
                        seenTs.add(d.timestamp);
                    }
                }
            });
            
            if (missingPoints > 0 || duplicatePoints > 0 || negativePoints > 0 || spikePoints > 0) {
                const issues = [];
                if (missingPoints > 0) issues.push(`${missingPoints} fehlende Intervalle`);
                if (duplicatePoints > 0) issues.push(`${duplicatePoints} doppelte Zeitstempel`);
                if (negativePoints > 0) issues.push(`${negativePoints} negative Leistungswerte`);
                if (spikePoints > 0) issues.push(`${spikePoints} unplausible Spitzen (>100 MW)`);
                
                alerts.push(`<strong>Datenqualität (${escapeHtml(ds.name)}):</strong> Der Datensatz enthält Qualitätsmängel (${issues.join(', ')}). Diese fehlerhaften Messpunkte wurden vor der Kapazitätsrechnung automatisch herausgefiltert (Lücken werden nicht interpoliert).`);
            }
        });
        
        if (alerts.length > 0) {
            qualityAlertTextEl.innerHTML = alerts.map(a => `<div style="margin-bottom: 4px;">${a}</div>`).join('');
            qualityAlertEl.classList.remove('hidden');
        } else {
            qualityAlertEl.classList.add('hidden');
        }
    }

    // Set labels
    const costTitleEl = document.getElementById('agnes-opt-cost-title');
    if (costTitleEl) {
        costTitleEl.innerHTML = currentAgnesMode === 'multi' 
            ? `Historisches Mehrjahres-Optimum (K<sub>opt</sub>)` 
            : `Optimale Buchung (K<sub>opt</sub>)`;
    }
    const durationTitleEl = document.getElementById('agnes-duration-title');
    if (durationTitleEl) {
        durationTitleEl.innerHTML = currentAgnesMode === 'multi'
            ? `Jahresdauerlinien`
            : `Jahresdauerlinie`;
    }

    // Perform cost calculation
    let pMax, kMin, optK, optResult, maxResult, minResult, sweepResults;
    let qualityPlausibility = null;
    let costsMulti = null;

    if (currentAgnesMode === 'multi') {
        const singleDataset = activeDataset;
        const yearsMap = {};
        
        // Group filtered data by year
        singleDataset.data.forEach(d => {
            const y = d.dateObj.getFullYear();
            if (!yearsMap[y]) yearsMap[y] = [];
            yearsMap[y].push(d);
        });
        
        // Sort years in ascending chronological order
        const sortedYears = Object.keys(yearsMap).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
        
        const datasetsMulti = sortedYears.map(y => {
            let shortName = singleDataset.name
                .replace(/\s*-\s*Wirkleistung.*/gi, '')
                .replace(/\s*-\s*Blindleistung.*/gi, '')
                .replace(/\s*-\s*Bezug.*/gi, '')
                .replace(/\.csv/gi, '')
                .trim();
            if (shortName.length > 20) {
                shortName = shortName.substring(0, 17) + '...';
            }
            return {
                id: singleDataset.id,
                name: `${shortName} (${y})`,
                data: yearsMap[y]
            };
        });

        let plannedKwVal = null;
        if (inputMinKw && pMaxClean > 0) {
            let val = parseInt(inputMinKw.value, 10);
            if (!isNaN(val)) plannedKwVal = val;
        }

        // The displayed multi-year optimum is explicitly the minimum of the
        // sum of annual costs (mean-cost strategy). Keep the strategy visible
        // in the UI/export instead of silently relying on a default.
        costsMulti = calculateAgnesCostsMulti(datasetsMulti, kp, ap1, ap2, minPercent, plannedKwVal, { strategy: 'avg' });
        if (!costsMulti || costsMulti.pMaxOverall === 0) return;
        
        pMax = costsMulti.pMaxOverall;
        kMin = costsMulti.plannedK || costsMulti.kMinOverall;
        optK = costsMulti.optK;
        optResult = costsMulti.optResult;
        maxResult = costsMulti.maxResult;
        minResult = costsMulti.plannedResult || costsMulti.minResult;
        sweepResults = costsMulti.sweepResults;
        qualityPlausibility = costsMulti.qualityPlausibility;
    } else {
        const dataset = activeDataset;
        const data = dataset.data;
        const minDate = data[0].dateObj;
        const maxDate = data[data.length - 1].dateObj;
        const durationMs = maxDate.getTime() - minDate.getTime() + 15 * 60 * 1000;
        const elapsedHours = durationMs / (1000 * 60 * 60);
        const year = minDate.getFullYear();
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        const annualHours = isLeapYear ? 8784 : 8760;
        const scaleFactorS = elapsedHours > 0 ? (annualHours / elapsedHours) : 1.0;

        const costs = calculateAgnesCosts(data, kp, ap1, ap2, minPercent, scaleFactorS);
        if (!costs || costs.pMax === 0) return;

        pMax = costs.pMax;
        kMin = costs.kMin;
        optK = costs.optK;
        optResult = costs.optResult;
        maxResult = costs.maxResult;
        minResult = costs.minResult;
        sweepResults = costs.sweepResults;
        qualityPlausibility = costs.qualityPlausibility;
    }

    // 5. Update KPI Cards
    const formatEuro = val => val.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    const formatKW = val => val.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + " kW";

    document.getElementById('agnes-kpi-peak').textContent = formatKW(pMax);
    document.getElementById('agnes-kpi-opt').textContent = formatKW(optK);
    
    if (currentAgnesMode === 'multi') {
        document.getElementById('agnes-kpi-opt-percent').textContent = `Modelloptimum (Beta, Mehrjahr, Mittelwertkosten)`;
        
        document.getElementById('agnes-kpi-max-cost').textContent = formatEuro(maxResult.totalCost);
        const maxDesc = document.getElementById('agnes-kpi-max-cost-desc');
        if (maxDesc) maxDesc.textContent = `Kumulierte Kosten bei Peak-Buchung`;
        
        document.getElementById('agnes-kpi-opt-cost').textContent = formatEuro(optResult.totalCost);
        const optDesc = document.getElementById('agnes-kpi-opt-cost-desc');
        if (optDesc) optDesc.textContent = `Kumulierte Kosten bei Kopt-Buchung`;
    } else {
        document.getElementById('agnes-kpi-opt-percent').textContent = `Modelloptimum (Beta): ${(optK / pMax * 100).toFixed(0)}% der Peaklast`;
        
        document.getElementById('agnes-kpi-max-cost').textContent = formatEuro(maxResult.totalCost);
        const maxDesc = document.getElementById('agnes-kpi-max-cost-desc');
        if (maxDesc) maxDesc.textContent = `Bei Peak-Buchung von ${formatKW(pMax)}`;
        
        document.getElementById('agnes-kpi-opt-cost').textContent = formatEuro(optResult.totalCost);
        const optDesc = document.getElementById('agnes-kpi-opt-cost-desc');
        if (optDesc) optDesc.textContent = `Bei Kopt-Buchung von ${formatKW(optK)}`;
    }

    const absoluteSavings = maxResult.totalCost - optResult.totalCost;
    const percentSavings = maxResult.totalCost > 0 ? (absoluteSavings / maxResult.totalCost * 100) : 0;
    
    document.getElementById('agnes-kpi-savings').textContent = formatEuro(absoluteSavings);
    if (currentAgnesMode === 'multi') {
        document.getElementById('agnes-kpi-savings-percent').textContent = `Ersparnis: ${percentSavings.toFixed(1)}% über alle Jahre`;
    } else {
        document.getElementById('agnes-kpi-savings-percent').textContent = `Ersparnis: ${percentSavings.toFixed(1)}% vs. Peak-Buchung`;
    }

    // 6. Update Comparison Table
    const tableBody = document.querySelector('#agnes-comparison-table tbody');
    if (tableBody) {
        const hdrMin = document.getElementById('agnes-table-hdr-min');
        if (hdrMin) {
            hdrMin.textContent = currentAgnesMode === 'multi' 
                ? `Geplante Buchung (${formatKW(kMin)})`
                : `Geplante Buchung (${(minPercent * 100).toFixed(0)}%)`;
        }
        
        const formatKWh = val => Math.round(val || 0).toLocaleString('de-DE') + " kWh";
        const calcPct = (num, den) => (den && den > 0) ? (num / den * 100).toFixed(1) : '0.0';
        
        tableBody.innerHTML = `
            <tr>
                <td style="padding: 0.8rem; font-weight: 500; border-bottom: 1px solid var(--border-color);">Gebuchte Kapazität</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatKW(kMin)}</td>
                <td style="padding: 0.8rem; text-align: right; font-weight: 700; color: var(--success-color); border-bottom: 1px solid var(--border-color);">${formatKW(optK)}</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatKW(pMax)}</td>
            </tr>
            <tr>
                <td style="padding: 0.8rem; font-weight: 500; border-bottom: 1px solid var(--border-color);">Feste Kapazitätskosten</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatEuro(minResult.capCost)}</td>
                <td style="padding: 0.8rem; text-align: right; font-weight: 600; color: var(--success-color); border-bottom: 1px solid var(--border-color);">${formatEuro(optResult.capCost)}</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatEuro(maxResult.capCost)}</td>
            </tr>
            <tr>
                <td style="padding: 0.8rem; font-weight: 500; border-bottom: 1px solid var(--border-color);">Arbeitsmenge AP 1 (Normal)</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color); font-size: 0.8rem;">
                    ${formatKWh(minResult.eWithin)}<br/>
                    <span style="color: var(--text-muted); font-size: 0.72rem;">(${calcPct(minResult.eWithin, minResult.eTotal)} %)</span>
                </td>
                <td style="padding: 0.8rem; text-align: right; font-weight: 600; color: var(--success-color); border-bottom: 1px solid var(--border-color); font-size: 0.8rem;">
                    ${formatKWh(optResult.eWithin)}<br/>
                    <span style="color: var(--success-color); font-size: 0.72rem; font-weight: 600;">(${calcPct(optResult.eWithin, optResult.eTotal)} %)</span>
                </td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color); font-size: 0.8rem;">
                    ${formatKWh(maxResult.eWithin)}<br/>
                    <span style="color: var(--text-muted); font-size: 0.72rem;">(${calcPct(maxResult.eWithin, maxResult.eTotal)} %)</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 0.8rem; font-weight: 500; border-bottom: 1px solid var(--border-color);">Arbeitsmenge AP 2 (Überschr.)</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color); font-size: 0.8rem;">
                    ${formatKWh(minResult.eExceed)}<br/>
                    <span style="color: var(--warning-color); font-size: 0.72rem;">(${calcPct(minResult.eExceed, minResult.eTotal)} %)</span>
                </td>
                <td style="padding: 0.8rem; text-align: right; font-weight: 600; color: var(--success-color); border-bottom: 1px solid var(--border-color); font-size: 0.8rem;">
                    ${formatKWh(optResult.eExceed)}<br/>
                    <span style="color: var(--warning-color); font-size: 0.72rem; font-weight: 600;">(${calcPct(optResult.eExceed, optResult.eTotal)} %)</span>
                </td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color); font-size: 0.8rem;">
                    ${formatKWh(maxResult.eExceed)}<br/>
                    <span style="color: var(--text-muted); font-size: 0.72rem;">(${calcPct(maxResult.eExceed, maxResult.eTotal)} %)</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 0.8rem; font-weight: 500; border-bottom: 1px solid var(--border-color);">Arbeitskosten AP 1 (Normal)</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatEuro(minResult.energyCostAp1)}</td>
                <td style="padding: 0.8rem; text-align: right; font-weight: 600; color: var(--success-color); border-bottom: 1px solid var(--border-color);">${formatEuro(optResult.energyCostAp1)}</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatEuro(maxResult.energyCostAp1)}</td>
            </tr>
            <tr>
                <td style="padding: 0.8rem; font-weight: 500; border-bottom: 1px solid var(--border-color);">Arbeitskosten AP 2 (Überschr.)</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatEuro(minResult.energyCostAp2)}</td>
                <td style="padding: 0.8rem; text-align: right; font-weight: 600; color: var(--success-color); border-bottom: 1px solid var(--border-color);">${formatEuro(optResult.energyCostAp2)}</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatEuro(maxResult.energyCostAp2)}</td>
            </tr>
            <tr style="background-color: rgba(16, 185, 129, 0.05); font-weight: 700;">
                <td style="padding: 0.8rem; border-bottom: none;">Gesamte Netzkosten (${currentAgnesMode === 'multi' ? 'kumuliert' : '€/a'})</td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: none;">
                    ${formatEuro(minResult.totalCost)}
                    ${minResult.totalCost > optResult.totalCost ? `<span style="display:block; font-size: 0.72rem; font-weight: 500; color: var(--warning-color); margin-top: 0.2rem;">(+${formatEuro(minResult.totalCost - optResult.totalCost)})</span>` : ''}
                </td>
                <td style="padding: 0.8rem; text-align: right; color: var(--success-color); font-size: 0.95rem; border-bottom: none;">
                    ${formatEuro(optResult.totalCost)}
                    <span style="display:block; font-size: 0.72rem; font-weight: 600; color: var(--success-color); margin-top: 0.2rem;">(Optimal)</span>
                </td>
                <td style="padding: 0.8rem; text-align: right; border-bottom: none;">
                    ${formatEuro(maxResult.totalCost)}
                    ${maxResult.totalCost > optResult.totalCost ? `<span style="display:block; font-size: 0.72rem; font-weight: 500; color: var(--warning-color); margin-top: 0.2rem;">(+${formatEuro(maxResult.totalCost - optResult.totalCost)})</span>` : ''}
                </td>
            </tr>
        `;
    }

    // Update Risiko-Matrix breakdown table
    const breakdownCard = document.getElementById('agnes-multi-breakdown-card');
    const breakdownBody = document.querySelector('#agnes-multi-breakdown-table tbody');

    if (currentAgnesMode === 'multi' && costsMulti) {
        if (breakdownCard) breakdownCard.classList.remove('hidden');
        if (breakdownBody && costsMulti.datasetInfos) {
            breakdownBody.innerHTML = costsMulti.datasetInfos.map((info, idx) => {
                const yDetail = optResult.yearlyDetails[idx];
                return `
                    <tr>
                        <td style="padding: 0.8rem; font-weight: 500; border-bottom: 1px solid var(--border-color);">${escapeHtml(info.name)}</td>
                        <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatKW(info.pMax)}</td>
                        <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color); color: var(--primary-color); font-weight: 600;">${formatKW(yDetail.optKSingleYear || info.pMax)}</td>
                        <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color); color: var(--success-color); font-weight: 600;">${formatKW(yDetail.actualK)}</td>
                        <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color); font-weight: 600;">${formatEuro(yDetail.totalCost)}</td>
                        <td style="padding: 0.8rem; text-align: right; border-bottom: 1px solid var(--border-color); color: ${yDetail.energyCostAp2 > 0 ? 'var(--warning-color)' : 'var(--text-muted)'};">
                            ${formatEuro(yDetail.energyCostAp2)} 
                            ${yDetail.eExceed > 0 ? `<br/><span style="font-size: 0.72rem;">(${(yDetail.eExceed / yDetail.eTotal * 100).toFixed(1)}% AP 2-Menge)</span>` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } else {
        if (breakdownCard) breakdownCard.classList.add('hidden');
    }

    // Update dataset labels on Szenarien-Vergleich and Jahresvergleich tabs
    const scenarioLabel = document.getElementById('agnes-scenario-ds-label');
    const breakdownLabel = document.getElementById('agnes-breakdown-ds-label');
    const dsDisplayName = activeDataset.name || '-';
    if (scenarioLabel) scenarioLabel.textContent = dsDisplayName;
    if (breakdownLabel) breakdownLabel.textContent = dsDisplayName;

    // Update chart headers with dataset name
    const durationTitle = document.getElementById('agnes-duration-title');
    const costTitle = document.getElementById('agnes-cost-title');
    if (durationTitle) {
        durationTitle.textContent = currentAgnesMode === 'multi' 
            ? `Jahresdauerlinien & Kapazitätsgrenze (Mehrjahres-Analyse)`
            : `Jahresdauerlinie & Kapazitätsgrenze (${dsDisplayName})`;
    }
    if (costTitle) {
        costTitle.textContent = currentAgnesMode === 'multi' 
            ? `Kumulierte Netzkosten-Kurve nach Buchungshöhe`
            : `Netzkosten-Kurve nach Buchungshöhe (${dsDisplayName})`;
    }

    // 7. Render Charts
    if (typeof renderAgnesDurationCurve === 'function') {
        if (currentAgnesMode === 'multi' && costsMulti) {
            renderAgnesDurationCurve(null, optK, pMax, costsMulti.datasetInfos);
        } else {
            renderAgnesDurationCurve(activeDataset.data, optK, pMax);
        }
    }
    if (typeof renderAgnesCostCurve === 'function') {
        renderAgnesCostCurve(sweepResults, optK);
    }
}

// --- AgNes Explanation Modal Controls (Managed by ui/ui.js) ---

function showDailyProfileInfoModal() {
    const modal = document.getElementById('agnes-info-modal');
    if (!modal) return;
    
    const titleEl = modal.querySelector('.modal-title');
    const contentEl = modal.querySelector('.modal-body-content');
    if (!titleEl || !contentEl) return;

    const title = 'Erklärung & Analyse-Möglichkeiten der Tagesprofile';
    const bodyHtml = `
        <p>
            Das <strong>Tagesprofil-Modul</strong> verdichtet Tausende von Messpunkten auf ein repräsentatives 24-Stunden-Fenster (00:00 bis 24:00 Uhr im 15-Minuten-Raster). So lassen sich wiederkehrende Muster, Sockellasten und Lastspitzen im Tagesverlauf präzise analysieren.
        </p>

        <h4 style="margin: 0.8rem 0 0.3rem 0; color: var(--primary-color); font-size: 0.9rem; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">
            📊 Was wird im Diagramm berechnet?
        </h4>
        <ul style="margin: 0.3rem 0; padding-left: 1.25rem; font-size: 0.83rem; display: flex; flex-direction: column; gap: 0.4rem;">
            <li><strong>Modus "Überlagerung":</strong> Jeder ausgewählte Tag wird als einzelne, transparente Linie gezeichnet. Extrem hilfreich, um atypische Tagesausreißer oder ungewöhnliche Nachtverbräuche sofort visuell zu identifizieren.</li>
            <li><strong>Modus "Mittelwert & Bandbreite":</strong> Berechnet für jeden der 96 Tageszeitpunkte den mathematischen Mittelwert (blaue Kurve), das historische Minimum/Maximum sowie die Standardabweichung (&sigma;). Perfekt zur Bestimmung der unvermeidbaren Sockellast (Grundlast).</li>
            <li><strong>Modus "Heatmap":</strong> Stellt jeden Tag als farbige Zeile über die 24 Stunden dar (Dunkelblau = niedrige Last, Gelb/Rot = hohe Last). Zeigt Schichtwechsel, Produktionszeiten und Wochenend-Absenkungen auf einen Blick.</li>
        </ul>

        <h4 style="margin: 0.9rem 0 0.3rem 0; color: var(--primary-color); font-size: 0.9rem; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem;">
            ⚙️ Welche Steuerungsmöglichkeiten haben Sie in der Sidebar?
        </h4>
        <ul style="margin: 0.3rem 0; padding-left: 1.25rem; font-size: 0.83rem; display: flex; flex-direction: column; gap: 0.4rem;">
            <li>📅 <strong>Wochentage vergleichen:</strong> Vergleichen Sie Montag bis Sonntag direkt miteinander, um z. B. den Stromverbrauch am Wochenende mit Werktagen zu kontrastieren.</li>
            <li>🔄 <strong>Mehrere Jahre / Zeiträume vergleichen:</strong> Überlagert die Tagesprofile verschiedener Jahre (z. B. 2023 vs. 2024), um Effizienzmaßnahmen zu überprüfen.</li>
            <li>🏢 <strong>Datenreihen / Standorte vergleichen:</strong> Vergleicht verschiedene Lastgänge oder Submeter auf der Tagesachse.</li>
            <li>🗓️ <strong>Filterung (Wochentage, Feiertage, Saison):</strong> Schränken Sie die Betrachtung z. B. nur auf Werktage, Wintermonate oder schalten Sie Feiertage ab.</li>
        </ul>

        <div style="background: rgba(59, 130, 246, 0.08); border-left: 4px solid var(--primary-color); padding: 0.75rem 0.9rem; border-radius: var(--radius-sm); margin-top: 0.6rem; font-size: 0.8rem; line-height: 1.45;">
            <strong>💡 Praxis-Tipp für Energieberater:</strong>
            Nutzen Sie den Button <em>"CSV Daten"</em> oben rechts, um das berechnete 24h-Profil (Mittelwert, Min, Max) direkt für Excel-Analysen zu exportieren. Prüfen Sie vor einer Weitergabe, ob sichtbare Datenreihen- oder Dateinamen Rückschlüsse zulassen.
        </div>
    `;

    titleEl.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--primary-color)" stroke-width="2.5" style="margin-right: 0.5rem; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        ${title}
    `;
    contentEl.innerHTML = bodyHtml;
    modal.classList.remove('hidden');
}

window.showAgnesInfoModal = showAgnesInfoModal;
window.showDailyProfileInfoModal = showDailyProfileInfoModal;
window.closeAgnesInfoModal = closeAgnesInfoModal;

function exportChartWithTitle(chartInstance, titleText, subtitleText, filename) {
    if (!chartInstance) return;

    const originalOption = chartInstance.getOption();
    const isDark = isDarkMode;
    const origGridTop = (originalOption.grid && originalOption.grid[0] && originalOption.grid[0].top) ? originalOption.grid[0].top : 55;

    chartInstance.setOption({
        title: {
            show: true,
            text: titleText,
            subtext: subtitleText || '',
            left: 20,
            top: 10,
            textStyle: {
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: 15,
                fontWeight: 'bold',
                fontFamily: 'Outfit, sans-serif'
            },
            subtextStyle: {
                color: isDark ? '#94a3b8' : '#64748b',
                fontSize: 11,
                fontFamily: 'Outfit, sans-serif'
            }
        },
        grid: {
            top: Math.max(typeof origGridTop === 'number' ? origGridTop : parseInt(origGridTop, 10) || 55, 75)
        }
    });

    const url = chartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: isDark ? '#1e293b' : '#ffffff'
    });

    chartInstance.setOption({
        title: { show: false },
        grid: { top: origGridTop }
    });

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Capacity scenario export functions (internal identifiers retained for compatibility)
function exportAgnesChart(type) {
    const chartInstance = type === 'duration' ? chartAgnesDuration : chartAgnesCost;
    if (!chartInstance) {
        showToast('Diagramm ist noch nicht bereit.', 'warning');
        return;
    }
    
    let filename = 'kapazitaet_jahresdauerlinie_beta.png';
    let titleText = 'Kapazitätsbestellung (Beta) - Jahresdauerlinie & Kapazitätsgrenze';
    if (type === 'cost') {
        filename = 'kapazitaet_kostenkurve_beta.png';
        titleText = 'Kapazitätsbestellung (Beta) - Kostenkurve';
    }
    
    let subtitleText = '';
    if (activeDatasetIds.length > 0 && allDatasets) {
        const activeDataset = allDatasets[activeDatasetIds[0]];
        if (activeDataset) {
            filename = activeDataset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + filename;
            subtitleText = `Lastgang: ${activeDataset.name}`;
        }
    }

    exportChartWithTitle(chartInstance, titleText, subtitleText, filename);
    showToast('Diagramm erfolgreich als PNG exportiert.', 'success');
}

async function exportAgnesCSV() {
    if (activeDatasetIds.length === 0 || !allDatasets || allDatasets.length === 0) {
        showToast('Keine Daten für den Export vorhanden.', 'error');
        return;
    }
    
    const dataset = allDatasets[activeDatasetIds[0]];
    const kp = parseFloat(document.getElementById('input-agnes-kp')?.value || 50.00);
    const ap1 = parseFloat(document.getElementById('input-agnes-ap1')?.value || 1.50);
    const ap2 = parseFloat(document.getElementById('input-agnes-ap2')?.value || 4.50);
    
    const data = dataset.data;
    
    // Compute SHA-256 fingerprint for data string
    const datasetSampleStr = dataset.name + '_' + data.length + '_' + (data[0] ? data[0].timestamp : 0) + '_' + (data[data.length - 1] ? data[data.length - 1].timestamp : 0);
    const fileHash = dataset.fileHash || await calculateStringHash(datasetSampleStr);

    // Calculate clean pMax to determine the threshold in kW
    let pMaxClean = 0;
    const seenTsForPeak = new Set();
    data.forEach(d => {
        if (!Number.isFinite(d.kw) || d.kw < 0 || d.kw > 100000) return;
        if (Number.isFinite(d.timestamp)) {
            if (seenTsForPeak.has(d.timestamp)) return;
            seenTsForPeak.add(d.timestamp);
        }
        if (d.kw > pMaxClean) {
            pMaxClean = d.kw;
        }
    });

    const inputMinKw = document.getElementById('input-agnes-min-kw');
    let minPercent = 0.1;
    let plannedKwVal = null;
    if (inputMinKw && pMaxClean > 0) {
        const minAllowedKw = Math.ceil(pMaxClean * 0.1);
        let val = parseInt(inputMinKw.value, 10);
        if (isNaN(val)) val = Math.round(pMaxClean * 0.2);
        val = Math.max(val, minAllowedKw);
        plannedKwVal = val;
        minPercent = val / pMaxClean;
    }

    if (currentAgnesMode === 'multi') {
        const yearsMap = {};
        data.forEach(d => {
            if (!d.dateObj) return;
            const y = d.dateObj.getFullYear();
            if (!yearsMap[y]) yearsMap[y] = [];
            yearsMap[y].push(d);
        });

        const datasetYears = Object.keys(yearsMap).map(Number).sort((a, b) => a - b);
        const shortName = dataset.name.replace(/\s*\(\d{4}(?:–\d{4})?\)$/, '');
        const datasetsMulti = datasetYears.map(y => ({
            id: dataset.id,
            name: `${shortName} (${y})`,
            data: yearsMap[y]
        }));

        const costsMulti = calculateAgnesCostsMulti(datasetsMulti, kp, ap1, ap2, minPercent, plannedKwVal);
        if (!costsMulti || costsMulti.pMaxOverall === 0) {
            showToast('Berechnungsfehler beim Export.', 'error');
            return;
        }

        const numYears = datasetYears.length;
        const qPlaus = costsMulti.qualityPlausibility || {};
        
        let csv = `# ==============================================================================\r\n`;
        csv += `# KAPAZITAETSBESTELLUNG - BETA-BERECHNUNGSPROTOKOLL\r\n`;
        csv += `# ==============================================================================\r\n`;
        csv += `# Berechnungs-ID (UUID):;${costsMulti.calculationId || generateUUID()}\r\n`;
        csv += `# Tool-Version:;${costsMulti.toolVersion || LASTGANG_APP_VERSION} (Modell: Kapazitaetsszenario Beta)\r\n`;
        csv += `# Erstellungs-Zeitstempel:;${costsMulti.timestampIso || new Date().toISOString()}\r\n`;
        csv += `# Ampel-Datenstatus:;${qPlaus.badgeLabel || '🟢 Datenbasis vollständig'} (${qPlaus.recommendationTitle || 'Szenariowert (Beta)'})\r\n`;
        csv += `# ${dataset.fileHash ? 'SHA-256 Quelldatei' : 'SHA-256 Datensatz-Metadaten'}:;${fileHash}\r\n`;
        csv += `# ------------------------------------------------------------------------------\r\n`;
        csv += `# BERECHNUNGSMETHODIK & FORMELN (EXPERIMENTELLES SZENARIOMODELL):\r\n`;
        csv += `# 1. Leistung je Intervall (kW): P_i = E_i / dt (dt = 0.25h)\r\n`;
        csv += `# 2. Jahreshöchstlast (kW): P_max = Max(P_i)\r\n`;
        csv += `# 3. Modell-Untergrenze K_min: eigene Eingabe oder P_max * 10% (Beta-Annahme, kein gesetzlicher Mindestwert)\r\n`;
        csv += `# 4. Effektive Kapazität K_eff: Max(K_gebucht, K_min)\r\n`;
        csv += `# 5. Feste Kapazitätskosten: C_Kap = K_eff * Kapazitätspreis (EUR/kW/a)\r\n`;
        csv += `# 6. Energiemengen-Aufteilung je Intervall (15 Min):\r\n`;
        csv += `#    - Wenn P_i <= K_eff: E_AP1 += P_i * 0.25h, E_AP2 += 0\r\n`;
        csv += `#    - Wenn P_i > K_eff:  E_AP1 += K_eff * 0.25h, E_AP2 += (P_i - K_eff) * 0.25h\r\n`;
        csv += `# 7. Arbeitskosten AP1 (Normal): C_AP1 = E_AP1 * AP1 / 100\r\n`;
        csv += `# 8. Arbeitskosten AP2 (Überschreitung): C_AP2 = E_AP2 * AP2 / 100\r\n`;
        csv += `# 9. Gesamte Netzkosten: C_Gesamt = C_Kap + C_AP1 + C_AP2\r\n`;
        csv += `# 10. Skalierungsfaktor S (bei Teiljahren): S = Stunden_Jahr / Stunden_geladen\r\n`;
        csv += `# ------------------------------------------------------------------------------\r\n`;
        csv += `# WARNHINWEISE & KONTROLLMETRIKEN:\r\n`;
        csv += `# BETA-HINWEIS:;Unverbindliche Szenariorechnung. Keine Abrechnungs-, Rechts-, Tarif- oder Investitionsberatung.\r\n`;
        if (qPlaus.warnings && qPlaus.warnings.length > 0) {
            qPlaus.warnings.forEach(w => { csv += `# WARNUNG:;${w.replace(/;/g, ',')}\r\n`; });
        } else {
            csv += `# HINWEIS:;Keine Warnungen. Alle mathematischen Invarianten erfuellt.\r\n`;
        }
        csv += `# ==============================================================================\r\n\r\n`;

        csv += `Kapazitaetsbestellung - experimentelle Mehrjahres-Szenariorechnung (Beta)\r\n`;
        csv += `Lastgang:;${dataset.name}\r\n`;
        csv += `Analysierte Jahre:;${datasetYears.join(', ')} (${numYears} Jahre)\r\n`;
        csv += `Kapazitaetspreis:;${kp.toFixed(2)} EUR/kW/a\r\n`;
        csv += `Arbeitspreis AP 1 (Normal):;${ap1.toFixed(2)} ct/kWh\r\n`;
        csv += `Arbeitspreis AP 2 (Ueberschreitung):;${ap2.toFixed(2)} ct/kWh\r\n`;
        csv += `Geplante Buchung:;${costsMulti.plannedK.toFixed(1)} kW (${(minPercent * 100).toFixed(0)} %)\r\n\r\n`;

        csv += `SZENARIEN-VERGLEICH (KUMULIERT UEBER ${numYears} JAHRE)\r\n`;
        csv += `Parameter / Kostenart;Geplante Buchung (${costsMulti.plannedK.toFixed(1)} kW);Optimale Buchung (Kopt: ${costsMulti.optK.toFixed(1)} kW);Maximale Buchung (Peak: ${costsMulti.pMaxOverall.toFixed(1)} kW)\r\n`;
        csv += `Gebuchte Kapazitaet (kW);${costsMulti.plannedK.toFixed(1)};${costsMulti.optK.toFixed(1)};${costsMulti.pMaxOverall.toFixed(1)}\r\n`;
        csv += `Gesamte Netzkosten kumuliert (EUR);${costsMulti.plannedResult.totalCost.toFixed(0)};${costsMulti.optResult.totalCost.toFixed(0)};${costsMulti.maxResult.totalCost.toFixed(0)}\r\n`;
        csv += `Durchschnittliche Jahreskosten (EUR/a);${(costsMulti.plannedResult.totalCost / numYears).toFixed(0)};${(costsMulti.optResult.totalCost / numYears).toFixed(0)};${(costsMulti.maxResult.totalCost / numYears).toFixed(0)}\r\n`;
        csv += `Feste Kapazitaetskosten kumuliert (EUR);${costsMulti.plannedResult.capCost.toFixed(0)};${costsMulti.optResult.capCost.toFixed(0)};${costsMulti.maxResult.capCost.toFixed(0)}\r\n`;
        csv += `Arbeitskosten AP 1 (Normal) kumuliert (EUR);${costsMulti.plannedResult.energyCostAp1.toFixed(0)};${costsMulti.optResult.energyCostAp1.toFixed(0)};${costsMulti.maxResult.energyCostAp1.toFixed(0)}\r\n`;
        csv += `Arbeitskosten AP 2 (Ueberschr.) kumuliert (EUR);${costsMulti.plannedResult.energyCostAp2.toFixed(0)};${costsMulti.optResult.energyCostAp2.toFixed(0)};${costsMulti.maxResult.energyCostAp2.toFixed(0)}\r\n\r\n`;

        csv += `JAHRESAUFSCHLUESSELUNG DER OPTIMALEN BUCHUNG (Kopt = ${costsMulti.optK.toFixed(1)} kW)\r\n`;
        csv += `Jahr / Lastgang;Jahreshoechstlast (kW);Effektive Buchung (kW);Kapazitaetskosten (EUR);AP1 Menge (kWh);AP2 Ueberschreitung (kWh);AP1 Kosten (EUR);AP2 Kosten (EUR);Gesamtkosten (EUR)\r\n`;
        costsMulti.optResult.yearlyDetails.forEach(yd => {
            csv += `${yd.name};${yd.pMax.toFixed(1)};${yd.actualK.toFixed(1)};${yd.capCost.toFixed(0)};${Math.round(yd.eWithin)};${Math.round(yd.eExceed)};${yd.energyCostAp1.toFixed(0)};${yd.energyCostAp2.toFixed(0)};${yd.totalCost.toFixed(0)}\r\n`;
        });
        csv += `\r\nMEHRJAHRES-SIMULATIONSVERLAUF (SWEEP)\r\n`;
        csv += `Buchungsstufe (kW);Gesamtkosten kumuliert (EUR);Durchschnittliche Jahreskosten (EUR/a);Arbeitskosten AP1 (EUR);Arbeitskosten AP2 (EUR)\r\n`;
        costsMulti.sweepResults.forEach(r => {
            csv += `${r.K.toFixed(1)};${r.totalCost.toFixed(0)};${(r.totalCost / numYears).toFixed(0)};${r.energyCostAp1.toFixed(0)};${r.energyCostAp2.toFixed(0)}\r\n`;
        });

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
        let filename = dataset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_mehrjahr_kapazitaet_beta.csv';
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showToast('Mehrjahres-Szenario mit Berechnungsprotokoll exportiert.', 'success');
        return;
    }

    const minDate = data[0].dateObj;
    const maxDate = data[data.length - 1].dateObj;
    const year = minDate.getFullYear();
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const annualHours = isLeapYear ? 8784 : 8760;
    const durationMs = maxDate.getTime() - minDate.getTime() + 15 * 60 * 1000;
    const elapsedHours = durationMs / (1000 * 60 * 60);
    const scaleFactorS = elapsedHours > 0 ? (annualHours / elapsedHours) : 1.0;
    
    const costs = calculateAgnesCosts(data, kp, ap1, ap2, minPercent, scaleFactorS);
    if (!costs) {
        showToast('Berechnungsfehler beim Export.', 'error');
        return;
    }
    
    const qPlaus = costs.qualityPlausibility || {};
    let csv = `# ==============================================================================\r\n`;
    csv += `# KAPAZITAETSBESTELLUNG - BETA-BERECHNUNGSPROTOKOLL\r\n`;
    csv += `# ==============================================================================\r\n`;
    csv += `# Berechnungs-ID (UUID):;${costs.calculationId || generateUUID()}\r\n`;
    csv += `# Tool-Version:;${costs.toolVersion || LASTGANG_APP_VERSION} (Modell: Kapazitaetsszenario Beta)\r\n`;
    csv += `# Erstellungs-Zeitstempel:;${costs.timestampIso || new Date().toISOString()}\r\n`;
    csv += `# Ampel-Datenstatus:;${qPlaus.badgeLabel || '🟢 Datenbasis vollständig'} (${qPlaus.recommendationTitle || 'Szenariowert (Beta)'})\r\n`;
    csv += `# ${dataset.fileHash ? 'SHA-256 Quelldatei' : 'SHA-256 Datensatz-Metadaten'}:;${fileHash}\r\n`;
    csv += `# ------------------------------------------------------------------------------\r\n`;
    csv += `# BERECHNUNGSMETHODIK & FORMELN (EXPERIMENTELLES SZENARIOMODELL):\r\n`;
    csv += `# 1. Leistung je Intervall (kW): P_i = E_i / dt (dt = 0.25h)\r\n`;
    csv += `# 2. Jahreshöchstlast (kW): P_max = Max(P_i)\r\n`;
    csv += `# 3. Modell-Untergrenze K_min: eigene Eingabe oder P_max * 10% (Beta-Annahme, kein gesetzlicher Mindestwert)\r\n`;
    csv += `# 4. Effektive Kapazität K_eff: Max(K_gebucht, K_min)\r\n`;
    csv += `# 5. Feste Kapazitätskosten: C_Kap = K_eff * Kapazitätspreis (EUR/kW/a)\r\n`;
    csv += `# 6. Energiemengen-Aufteilung je Intervall (15 Min):\r\n`;
    csv += `#    - Wenn P_i <= K_eff: E_AP1 += P_i * 0.25h, E_AP2 += 0\r\n`;
    csv += `#    - Wenn P_i > K_eff:  E_AP1 += K_eff * 0.25h, E_AP2 += (P_i - K_eff) * 0.25h\r\n`;
    csv += `# 7. Arbeitskosten AP1 (Normal): C_AP1 = E_AP1 * AP1 / 100\r\n`;
    csv += `# 8. Arbeitskosten AP2 (Überschreitung): C_AP2 = E_AP2 * AP2 / 100\r\n`;
    csv += `# 9. Gesamte Netzkosten: C_Gesamt = C_Kap + C_AP1 + C_AP2\r\n`;
    csv += `# 10. Skalierungsfaktor S (bei Teiljahren): S = Stunden_Jahr / Stunden_geladen\r\n`;
    csv += `# ------------------------------------------------------------------------------\r\n`;
    csv += `# WARNHINWEISE & KONTROLLMETRIKEN:\r\n`;
    csv += `# BETA-HINWEIS:;Unverbindliche Szenariorechnung. Keine Abrechnungs-, Rechts-, Tarif- oder Investitionsberatung.\r\n`;
    if (qPlaus.warnings && qPlaus.warnings.length > 0) {
        qPlaus.warnings.forEach(w => { csv += `# WARNUNG:;${w.replace(/;/g, ',')}\r\n`; });
    } else {
        csv += `# HINWEIS:;Keine Warnungen. Alle mathematischen Invarianten erfuellt.\r\n`;
    }
    csv += `# ==============================================================================\r\n\r\n`;

    csv += `Kapazitaetsbestellung - experimentelle Szenariorechnung (Beta, Einzeljahr)\r\n`;
    csv += `Lastgang:;${dataset.name}\r\n`;
    csv += `Zeitraum:;${minDate.toLocaleDateString('de-DE')} bis ${maxDate.toLocaleDateString('de-DE')}\r\n`;
    csv += `Kapazitaetspreis:;${kp.toFixed(2)} EUR/kW/a\r\n`;
    csv += `Arbeitspreis AP 1 (Normal):;${ap1.toFixed(2)} ct/kWh\r\n`;
    csv += `Arbeitspreis AP 2 (Ueberschreitung):;${ap2.toFixed(2)} ct/kWh\r\n`;
    csv += `Geplante Buchung:;${(minPercent * 100).toFixed(0)} %\r\n\r\n`;
    
    csv += `SZENARIEN-VERGLEICH\r\n`;
    csv += `Parameter / Kostenart;Geplante Buchung (${(minPercent * 100).toFixed(0)}%);Optimale Buchung (Kopt);Maximale Buchung (100%)\r\n`;
    csv += `Gebuchte Kapazitaet (kW);${costs.kMin.toFixed(1)};${costs.optK.toFixed(1)};${costs.pMax.toFixed(1)}\r\n`;
    csv += `Feste Kapazitaetskosten (EUR/a);${costs.minResult.capCost.toFixed(0)};${costs.optResult.capCost.toFixed(0)};${costs.maxResult.capCost.toFixed(0)}\r\n`;
    csv += `Arbeitsmenge AP 1 (Normal) (kWh);${Math.round(costs.minResult.eWithin)};${Math.round(costs.optResult.eWithin)};${Math.round(costs.maxResult.eWithin)}\r\n`;
    csv += `Arbeitsmenge AP 2 (Ueberschr.) (kWh);${Math.round(costs.minResult.eExceed)};${Math.round(costs.optResult.eExceed)};${Math.round(costs.maxResult.eExceed)}\r\n`;
    csv += `Arbeitskosten AP 1 (Normal) (EUR/a);${costs.minResult.energyCostAp1.toFixed(0)};${costs.optResult.energyCostAp1.toFixed(0)};${costs.maxResult.energyCostAp1.toFixed(0)}\r\n`;
    csv += `Arbeitskosten AP 2 (Ueberschr.) (EUR/a);${costs.minResult.energyCostAp2.toFixed(0)};${costs.optResult.energyCostAp2.toFixed(0)};${costs.maxResult.energyCostAp2.toFixed(0)}\r\n`;
    csv += `Gesamte Netzkosten (EUR/a);${costs.minResult.totalCost.toFixed(0)};${costs.optResult.totalCost.toFixed(0)};${costs.maxResult.totalCost.toFixed(0)}\r\n\r\n`;
    
    csv += `SIMULATIONSVERLAUF (SWEEP)\r\n`;
    csv += `Buchungsstufe (kW);Kapazitaetskosten (EUR);Arbeitskosten AP1 (EUR);Arbeitskosten AP2 (EUR);Gesamtkosten (EUR)\r\n`;
    costs.sweepResults.forEach(r => {
        csv += `${r.K.toFixed(1)};${r.capCost.toFixed(0)};${r.energyCostAp1.toFixed(0)};${r.energyCostAp2.toFixed(0)};${r.totalCost.toFixed(0)}\r\n`;
    });
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    let filename = 'kapazitaet_szenariobericht_beta.csv';
    filename = dataset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + filename;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showToast('Einzeljahr-Szenario mit Berechnungsprotokoll exportiert.', 'success');
}

async function printAgnesReport() {
    if (activeDatasetIds.length === 0 || !allDatasets || allDatasets.length === 0) {
        showToast('Keine Daten für den PDF-Druck vorhanden.', 'error');
        return;
    }

    const dataset = allDatasets[activeDatasetIds[0]];
    const data = dataset.data;
    const kp = parseFloat(document.getElementById('input-agnes-kp')?.value || 50.00);
    const ap1 = parseFloat(document.getElementById('input-agnes-ap1')?.value || 1.50);
    const ap2 = parseFloat(document.getElementById('input-agnes-ap2')?.value || 4.50);

    const datasetSampleStr = dataset.name + '_' + data.length + '_' + (data[0] ? data[0].timestamp : 0);
    const fileHash = dataset.fileHash || await calculateStringHash(datasetSampleStr);

    let auditInfo = null;
    if (currentAgnesMode === 'multi') {
        const yearsMap = {};
        data.forEach(d => {
            if (!d.dateObj) return;
            const y = d.dateObj.getFullYear();
            if (!yearsMap[y]) yearsMap[y] = [];
            yearsMap[y].push(d);
        });
        const datasetYears = Object.keys(yearsMap).map(Number).sort((a, b) => a - b);
        const shortName = dataset.name.replace(/\s*\(\d{4}(?:–\d{4})?\)$/, '');
        const datasetsMulti = datasetYears.map(y => ({ id: dataset.id, name: `${shortName} (${y})`, data: yearsMap[y] }));
        const res = calculateAgnesCostsMulti(datasetsMulti, kp, ap1, ap2);
        auditInfo = {
            calcId: res.calculationId,
            version: res.toolVersion,
            timestamp: res.timestampIso,
            quality: res.qualityPlausibility
        };
    } else {
        const res = calculateAgnesCosts(data, kp, ap1, ap2);
        auditInfo = {
            calcId: res.calculationId,
            version: res.toolVersion,
            timestamp: res.timestampIso,
            quality: res.qualityPlausibility
        };
    }

    // Ensure print audit banner is attached in #tab-agnes-content
    let banner = document.getElementById('agnes-print-audit-header');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'agnes-print-audit-header';
        banner.className = 'print-only-audit-banner';
        const infoBar = document.getElementById('agnes-active-info-bar');
        if (infoBar && infoBar.parentNode) {
            infoBar.parentNode.insertBefore(banner, infoBar);
        }
    }

    const qStatus = auditInfo.quality || {};
    const badgeColor = qStatus.status === 'RED' ? '#ef4444' : (qStatus.status === 'YELLOW' ? '#f59e0b' : '#10b981');

    banner.innerHTML = `
        <div style="border: 2px solid ${badgeColor}; border-radius: 8px; padding: 12px 16px; margin-bottom: 15px; background: #fafafa; color: #0f172a; font-family: sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                <div>
                    <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">Kapazitätsbestellung - Beta-Berechnungsprotokoll</h2>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Experimentelle, unverbindliche Szenariorechnung</div>
                </div>
                <div style="background: ${badgeColor}; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700;">
                    ${qStatus.badgeLabel || '🟢 Datenbasis vollständig'}
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 11px; color: #334155;">
                <div><strong>Berechnungs-ID (UUID):</strong> ${auditInfo.calcId}</div>
                <div><strong>Tool- & Modell-Version:</strong> ${auditInfo.version} (Kapazitätsszenario Beta)</div>
                <div><strong>Prüf-Zeitstempel (ISO):</strong> ${auditInfo.timestamp}</div>
                <div style="word-break: break-all;"><strong>${dataset.fileHash ? 'SHA-256 Quelldatei' : 'SHA-256 Datensatz-Metadaten'}:</strong> ${fileHash}</div>
            </div>
            ${qStatus.warnings && qStatus.warnings.length > 0 ? `
                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #b45309;">
                    <strong>Warnhinweise:</strong> ${qStatus.warnings.join(' | ')}
                </div>
            ` : ''}
            <div style="margin-top: 8px; padding: 7px 9px; border-left: 3px solid #f59e0b; background: #fffbeb; color: #78350f; font-size: 10px;">
                Beta: unverbindliche Szenariorechnung. Keine Abrechnungs-, Rechts-, Tarif- oder Investitionsberatung.
            </div>
        </div>
    `;

    // Add printing class to body
    document.body.classList.add('printing-report');
    
    // Force charts to resize to the print width
    if (typeof chartAgnesDuration !== 'undefined' && chartAgnesDuration) {
        chartAgnesDuration.resize({ width: 'auto', height: 400 });
    }
    if (typeof chartAgnesCost !== 'undefined' && chartAgnesCost) {
        chartAgnesCost.resize({ width: 'auto', height: 400 });
    }
    
    // Use a tiny timeout to let ECharts repaint before printing
    setTimeout(() => {
        window.print();
        
        // Cleanup after printing dialog closes
        document.body.classList.remove('printing-report');
        setTimeout(() => {
            if (typeof chartAgnesDuration !== 'undefined' && chartAgnesDuration) {
                chartAgnesDuration.resize();
            }
            if (typeof chartAgnesCost !== 'undefined' && chartAgnesCost) {
                chartAgnesCost.resize();
            }
        }, 300);
    }, 100);
}

window.exportAgnesChart = exportAgnesChart;
window.exportAgnesCSV = exportAgnesCSV;
window.printAgnesReport = printAgnesReport;

function renderQualityLog(activeFilteredDatasets) {
    const container = document.getElementById('quality-log-container');
    if (!container) return;

    if (activeFilteredDatasets.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.85rem;">Kein Lastgang geladen.</div>`;
        return;
    }

    const stepMs = 15 * 60 * 1000;
    const toleranceMs = 60 * 1000; // 1 minute tolerance for DST transitions etc.
    
    let html = '';

    activeFilteredDatasets.forEach(item => {
        const datasetName = item.name;
        const filteredData = item.data;
        
        // Robust gap detection: compare consecutive sorted data points.
        // A gap exists wherever two adjacent timestamps are more than 15min + tolerance apart.
        const gaps = [];

        if (filteredData.length > 1) {
            let gapStart = null;
            let gapEnd = null;

            for (let i = 1; i < filteredData.length; i++) {
                const prevTs = filteredData[i - 1].timestamp;
                const currTs = filteredData[i].timestamp;
                const diff = currTs - prevTs;

                if (diff > stepMs + toleranceMs) {
                    // Gap found between prevTs and currTs
                    // The missing range starts one step after prevTs and ends one step before currTs
                    const missingStart = prevTs + stepMs;
                    const missingEnd = currTs - stepMs;
                    const missingIntervals = Math.round(diff / stepMs) - 1;
                    
                    gaps.push({ 
                        start: missingStart, 
                        end: missingEnd >= missingStart ? missingEnd : missingStart,
                        intervals: Math.max(1, missingIntervals)
                    });
                }
            }
        }

        // Render sections per dataset
        html += `<div style="margin-bottom: 1rem;">`;
        html += `<h4 style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--primary-color); display: flex; justify-content: space-between;">`;
        html += `<span>Lastgang: ${escapeHtml(datasetName)}</span>`;
        html += `<span style="font-weight: 500; font-size: 0.75rem; color: ${gaps.length > 0 ? 'var(--warning-color)' : 'var(--success-color)'};">`;
        html += `${gaps.length === 0 ? '✓ Vollständig (0 Lücken)' : `⚠ ${gaps.length} Lücke(n) erkannt`}`;
        html += `</span>`;
        html += `</h4>`;

        if (gaps.length === 0) {
            html += `
                <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-sm); padding: 0.75rem; font-size: 0.8rem; color: var(--success-color); display: flex; align-items: center; gap: 8px;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Der Lastgang enthält im ausgewählten Zeitraum keine Datenlücken. Alle Messintervalle sind lückenlos vorhanden.
                </div>
            `;
        } else {
            html += `
                <div class="table-container" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: var(--surface-color);">
                    <table class="data-table" style="display: table; width: 100%;">
                        <thead style="background-color: var(--surface-hover); color: var(--text-muted); display: table-header-group;">
                            <tr>
                                <th style="padding: 0.5rem 0.75rem; font-size: 0.75rem; font-weight: 600; text-align: left;">Lücke #</th>
                                <th style="padding: 0.5rem 0.75rem; font-size: 0.75rem; font-weight: 600; text-align: left;">Von (Anfang)</th>
                                <th style="padding: 0.5rem 0.75rem; font-size: 0.75rem; font-weight: 600; text-align: left;">Bis (Ende)</th>
                                <th style="padding: 0.5rem 0.75rem; font-size: 0.75rem; font-weight: 600; text-align: right;">Dauer (Intervalle)</th>
                            </tr>
                        </thead>
                        <tbody style="display: table-row-group;">
            `;

            const limit = 15;
            const displayGaps = gaps.slice(0, limit);
            
            displayGaps.forEach((gap, idx) => {
                const startD = new Date(gap.start);
                const endD = new Date(gap.end);
                const intervals = gap.intervals || (Math.round((gap.end - gap.start) / stepMs) + 1);
                
                const formatTime = d => d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                
                html += `
                    <tr>
                        <td style="padding: 0.5rem 0.75rem; font-size: 0.78rem; border-bottom: 1px solid var(--border-color); color: var(--text-main); font-weight: 500;">${idx + 1}</td>
                        <td style="padding: 0.5rem 0.75rem; font-size: 0.78rem; border-bottom: 1px solid var(--border-color); color: var(--text-main);">${formatTime(startD)}</td>
                        <td style="padding: 0.5rem 0.75rem; font-size: 0.78rem; border-bottom: 1px solid var(--border-color); color: var(--text-main);">${formatTime(endD)}</td>
                        <td style="padding: 0.5rem 0.75rem; font-size: 0.78rem; border-bottom: 1px solid var(--border-color); text-align: right; color: var(--warning-color); font-weight: 600;">
                            ${intervals} (${(intervals * 15).toLocaleString('de-DE')} Min)
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            if (gaps.length > limit) {
                html += `
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem; font-style: italic; text-align: right;">
                        ... und ${gaps.length - limit} weitere kleinere Datenlücken im ausgewählten Zeitraum.
                    </div>
                `;
            }
        }
        html += `</div>`;
    });

    container.innerHTML = html;
}

window.renderQualityLog = renderQualityLog;

function adjustDateRangeForAgnes() {
    if (!allDatasets || allDatasets.length === 0) return;
    
    const activeDatasets = activeDatasetIds.map(idx => allDatasets[idx]).filter(Boolean);
    if (activeDatasets.length === 0) return;
    
    if (currentAgnesMode === 'single') {
        const selectAgnesDs = document.getElementById('select-agnes-dataset');
        const currentSelId = selectAgnesDs ? parseInt(selectAgnesDs.value, 10) : activeDatasetIds[0];
        const ds = allDatasets[currentSelId] || activeDatasets[0];
        if (ds && ds.data && ds.data.length > 0) {
            const dsStart = ds.data[0].dateObj;
            const dsEnd = ds.data[ds.data.length - 1].dateObj;
            
            let currentDays = 0;
            if (globalDateRange.start && globalDateRange.end) {
                const currentDiff = globalDateRange.end.getTime() - globalDateRange.start.getTime();
                currentDays = currentDiff / (1000 * 60 * 60 * 24);
            }
            
            // If current selection is invalid, out of bounds, or too long, snap to the first complete calendar year
            if (currentDays === 0 || currentDays > 366.5 || !globalDateRange.start || globalDateRange.end.getTime() < dsStart.getTime() || globalDateRange.start.getTime() > dsEnd.getTime()) {
                const firstYear = dsStart.getFullYear();
                globalDateRange.start = new Date(firstYear, 0, 1);
                globalDateRange.end = new Date(firstYear, 11, 31, 23, 59, 59, 999);
                currentZoom = 'year'; // Sync button active state to "1 J"
            }
        }
    } else {
        let minD = null;
        let maxD = null;
        
        activeDatasets.forEach(ds => {
            if (ds.data && ds.data.length > 0) {
                const start = ds.data[0].dateObj;
                const end = ds.data[ds.data.length - 1].dateObj;
                if (!minD || start < minD) minD = start;
                if (!maxD || end > maxD) maxD = end;
            }
        });
        
        if (minD && maxD) {
            let startYear = minD.getFullYear();
            let endYear = maxD.getFullYear();
            
            // Check if the end year is incomplete (starts on Jan 1st but maxD is less than 350 days into the year)
            const endYearStart = new Date(endYear, 0, 1);
            const endYearDays = (maxD.getTime() - endYearStart.getTime()) / (1000 * 60 * 60 * 24);
            
            if (endYearDays < 350.0 && endYear > startYear) {
                // Snap back to the last day of the previous year
                maxD = new Date(endYear - 1, 11, 31, 23, 59, 59, 999);
            }
            
            // Check if the start year is incomplete (starts after Jan 15th)
            const startYearStart = new Date(startYear, 0, 1);
            const startYearMissingDays = (minD.getTime() - startYearStart.getTime()) / (1000 * 60 * 60 * 24);
            
            if (startYearMissingDays > 15.0 && startYear < endYear) {
                // Snap forward to Jan 1st of the next year
                minD = new Date(startYear + 1, 0, 1);
            }
            
            globalDateRange.start = new Date(minD.getTime());
            globalDateRange.end = new Date(maxD.getTime());
        }
    }
    
    // Sync UI fields
    const inputDateStart = document.getElementById('date-start');
    const inputDateEnd = document.getElementById('date-end');
    if (inputDateStart && globalDateRange.start) {
        inputDateStart.value = globalDateRange.start.getFullYear() + '-' + 
            String(globalDateRange.start.getMonth() + 1).padStart(2, '0') + '-' + 
            String(globalDateRange.start.getDate()).padStart(2, '0');
    }
    if (inputDateEnd && globalDateRange.end) {
        inputDateEnd.value = globalDateRange.end.getFullYear() + '-' + 
            String(globalDateRange.end.getMonth() + 1).padStart(2, '0') + '-' + 
            String(globalDateRange.end.getDate()).padStart(2, '0');
    }
    
    // Synchronize active state for zoom buttons
    document.querySelectorAll('.btn-zoom').forEach(b => {
        b.classList.toggle('active', b.dataset.zoom === currentZoom);
    });
}
window.adjustDateRangeForAgnes = adjustDateRangeForAgnes;
