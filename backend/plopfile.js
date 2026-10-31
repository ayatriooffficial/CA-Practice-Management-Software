// plopfile.js for backend code generation
module.exports = function (plop) {
    // Helper to convert name to PascalCase
    const toPascal = (str) => str.replace(/(^\w|[-_]\w)/g, (m) => m.replace(/[-_]/, '').toUpperCase());

    plop.setGenerator('client-module', {
        description: 'Generate a new client module (controller, service, model, routes, validation)',
        prompts: [
            {
                type: 'input',
                name: 'name',
                message: 'Module name (e.g., client)',
                default: 'client',
            },
        ],
        actions: function (data) {
            const name = data.name.toLowerCase();
            const pascal = toPascal(name);
            const actions = [];
            const basePath = `src/modules/${name}`;
            const tmplPath = 'plop-templates/client';

            // Controller
            actions.push({
                type: 'add',
                path: `${basePath}/${name}.controller.ts`,
                templateFile: `${tmplPath}/controller.hbs`,
                data: { name, pascal },
            });
            // Service
            actions.push({
                type: 'add',
                path: `${basePath}/${name}.service.ts`,
                templateFile: `${tmplPath}/service.hbs`,
                data: { name, pascal },
            });
            // Model
            actions.push({
                type: 'add',
                path: `${basePath}/${name}.model.ts`,
                templateFile: `${tmplPath}/model.hbs`,
                data: { name, pascal },
            });
            // Routes
            actions.push({
                type: 'add',
                path: `${basePath}/${name}.routes.ts`,
                templateFile: `${tmplPath}/routes.hbs`,
                data: { name, pascal },
            });
            // Interface
            actions.push({
                type: 'add',
                path: `${basePath}/${name}.interface.ts`,
                templateFile: `${tmplPath}/interface.hbs`,
                data: { name, pascal },
            });
            // Validator (Zod)
            actions.push({
                type: 'add',
                path: `${basePath}/${name}.validator.ts`,
                templateFile: `${tmplPath}/validator.hbs`,
                data: { name, pascal },
            });
            // (Optional) keep legacy validation if needed
            actions.push({
                type: 'add',
                path: `${basePath}/${name}.validation.ts`,
                templateFile: `${tmplPath}/validation.hbs`,
                data: { name, pascal },
            });
            return actions;
        },
    });
};
