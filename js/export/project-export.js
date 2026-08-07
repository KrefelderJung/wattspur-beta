/**
 * Project Export Module (js/export/project-export.js)
 * Serializes and deserializes .lastgang JSON project files
 */

if (typeof window !== 'undefined') {
    if (typeof window.ProjectExport === 'undefined') {
        window.ProjectExport = {
            exportProject: function(allDatasets, globalSettings = {}) {
                const projectData = {
                    version: "2026.07.24",
                    projectFormat: "lastgang_analyse_v1",
                    createdIso: new Date().toISOString(),
                    globalSettings: globalSettings,
                    datasets: (allDatasets || []).map(ds => ({
                        id: ds.id,
                        name: ds.name,
                        fileHash: ds.fileHash || null,
                        data: (ds.data || []).map(d => ({
                            timestamp: d.timestamp || (d.dateObj ? d.dateObj.getTime() : Date.now()),
                            kw: d.kw !== undefined ? d.kw : (d.powerKw || 0),
                            kvar: d.kvar || null,
                            status: d.status || 'VALID'
                        }))
                    }))
                };

                const jsonStr = JSON.stringify(projectData, null, 2);
                if (window.triggerDownload) {
                    window.triggerDownload(jsonStr, 'lastgang_projekt.lastgang', 'application/json');
                }
                return jsonStr;
            },

            importProject: function(jsonString) {
                const parsed = JSON.parse(jsonString);
                if (!parsed || parsed.projectFormat !== 'lastgang_analyse_v1' || !Array.isArray(parsed.datasets)) {
                    throw new Error("Ungültiges .lastgang Projektdateiformat.");
                }
                
                const datasets = parsed.datasets.map(ds => ({
                    id: ds.id,
                    name: ds.name,
                    fileHash: ds.fileHash,
                    data: (ds.data || []).map(d => ({
                        timestamp: d.timestamp,
                        dateObj: new Date(d.timestamp),
                        kw: d.kw,
                        kvar: d.kvar,
                        status: d.status || 'VALID'
                    }))
                }));

                return {
                    datasets: datasets,
                    globalSettings: parsed.globalSettings || {}
                };
            }
        };
    }
}
