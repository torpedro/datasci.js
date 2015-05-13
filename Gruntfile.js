module.exports = function(grunt) {

    grunt.initConfig({
        cfg: {
            'libName': 'ds',
             
            'src': './src/',
            'test': './test/',
            'build': './build/'
        },

        watch: {
            options: {
                livereload: true
            },
            src: {
                files: [
                    '<%= cfg.src %>/**/*.ts',
                    '<%= cfg.src %>/**/*.js'
                ],
                tasks: ['build', 'just-test']
            },
            test: {
                files: [
                    '<%= cfg.test %>/**/*.ts',
                    '<%= cfg.test %>/**/*.js'
                ],
                tasks: ['just-test']
            }
        },

        clean: {
            build: {
                files: [{
                    dot: true,
                    src: '<%= cfg.build %>/*'
                }]
            }
        },
		
		
        copy: {
            src: {
				// Copy all src files to the build-directory
                files: [{
                    dot: true,
                    expand: true,
                    cwd: '<%= cfg.src %>/',
                    src: ['**/*'],
                    dest: '<%= cfg.build %>/src/'
                }]
            },
            
            test: {
				// Copy all test files to the build-directory
                files: [{
                    dot: true,
                    expand: true,
                    cwd: '<%= cfg.test %>/',
                    src: ['**/*'],
                    dest: '<%= cfg.build %>/test/'
                }]
            }
		},
		
		
        // Compile the Typescript files to JavaScript
        typescript: {
            options: {
                sourceMap: true
            },
            src: {
                options: {
                    module: 'commonjs'
                },
                src: ['<%= cfg.build %>/src/**/*.ts']
            },
            test: {
                options: {
                    module: 'commonjs'
                },
                src: ['<%= cfg.build %>/test/**/*.ts']
            }
        },
        
        // Configure a mochaTest task
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    quiet: false,
                    clearRequireCache: false
                },
                src: ['<%= cfg.build %>/test/**/*.js']
            }
        },
        
        // Browserify for web release
        browserify: {
            options: {
                browserifyOptions: {
                    standalone: '<%= cfg.libName %>'      
                }
            },
            src: {
                src: '<%= cfg.build %>/src/app.js',
                dest: '<%= cfg.build %>/app-full.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('build', [
        'clean:build',
        'copy:src',
        'typescript:src',
        'browserify'
    ]);
    
    grunt.registerTask('just-test', [
        'copy:test',
        'typescript:test',
        'mochaTest'
    ])
    
    grunt.registerTask('test', [
        'build',
        'just-test'
    ])

    grunt.registerTask('default', ['build', 'test'])
};