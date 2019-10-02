using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Lemonade_Stand
{
    class Weather
    {

        //member variables (Has A)
        public string condition;
        public int temperature;
        private List<string> weatherConditions;
        public string predictedForecast;



        // Constructor
        public Weather()
        {
            weatherConditions = new List<string>() { "Sunny", "Cloudy", "Rainy", "Foggy" };
            condition = TodaysCondition();

        }
        public string TodaysCondition()
        {
            Random rng = new Random();
            int num = rng.Next(4);
            return weatherConditions[num];
        }
        //public string TodaysForcast()
        //{
          //  Random rng = new Random();
            //int num = rng.Next();
            //return predictedForecast[num];
        //}





        // member methods
    }
}
