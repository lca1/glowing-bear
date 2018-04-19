import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Rx';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable()
export class AppConfig {

  public static path = 'app/config/';
  private config: Object = null;
  private env: Object = null;

  // see this gist: https://gist.github.com/fernandohu/122e88c3bcd210bbe41c608c36306db9
  constructor(private http: HttpClient) {
  }

  /**
   * Use to get the data found in the second file (config file)
   * if present; returns default value otherwise.
   */
  public getConfig(key: any, defaultValue: any = null) {
      let value = this.config[key];
      return value != null ? value : defaultValue;
  }

  /**
   * Use to get the data found in the first file (env file)
   */
  public getEnv(key: any) {
    return this.env[key];
  }

  /**
   * This method:
   *   a) Loads "env.json" to get the current working environment (e.g.: 'production', 'development')
   *   b) Loads "config.[env].json" to get all env's variables (e.g.: 'config.development.json')
   */
  public load() {
    return new Promise((resolve, reject) => {

      const options = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      };
      this.http
        .get(AppConfig.path + 'env.json', options)
        .catch((error: any): any => {
          console.error('Configuration file "env.json" could not be read');
          resolve(true);
          return Observable.throw(error.json().error || 'Server error');
        })
        .subscribe((envResponse) => {
          this.env = envResponse;
          let request: any = null;

          switch (this.getEnv('env')) {
            case 'prod': {
              request = this.http.get(AppConfig.path + 'config.' + this.getEnv('env') + '.json');
            }
              break;

            case 'dev': {
              request = this.http.get(AppConfig.path + 'config.' + this.getEnv('env') + '.json');
            }
              break;

            case 'default': {
              console.error('Environment file is not set or invalid');
              resolve(true);
            }
              break;
          }

          if (request) {
            request
              .catch((error: any) => {
                console.error('Error reading ' + this.getEnv('env') + ' configuration file');
                resolve(error);
                return Observable.throw(error.json().error || 'Server error');
              })
              .subscribe((responseData) => {
                this.config = responseData;
                console.log('Successfully retrieved config: ', this.config);
                resolve(true);
              });
          } else {
            console.error('Env config file "env.json" is not valid');
            resolve(true);
          }
        });

    });
  }
}
