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
        public string Condition;
        public int Temperature;
        private List<string> WeatherConditions;
        public string PredictedForecast;

        // Constructor
        public Weather()
        {
            WeatherConditions = new List<string>() { "Sunny", "Cloudy", "Rainy", "Foggy" };
            Condition = TodaysCondition();
            Temperature = TodaysTemperature();
            PredictedForecast = TodaysForcast();

        }
        // member methods

        public string TodaysCondition()
        {
            Random rng = new Random();
            int num = rng.Next(4);
            return WeatherConditions[num];
        }
        public string TodaysForcast()
        {
            Random rng = new Random();
            int num = rng.Next(4);
            return WeatherConditions[num];
        }
        public int TodaysTemperature()
        {
            Random rng = new Random();
            int num = rng.Next(60, 100);
            return num;
            

        }
    }
}