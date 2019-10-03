using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Lemonade_Stand
{
    class Day
    {
        //member variables (Has A)
        public Weather weather;
        public List<Customer> customers;
        public string DayOfWeek;

        // Constructor
        public Day(string dayOfWeek)
        {
            DayOfWeek = dayOfWeek;
            weather = new Weather();
            customers = new List<Customer>();
            createCustomer(weather);
        }

        // member methods
        public void createCustomer(Weather PastInWeather)
        {
            int numOfCustomers = 0;
            if(PastInWeather.Condition == "Sunny")
            {
                numOfCustomers = 30;
            }
            else if(PastInWeather.Condition == "Cloudy")
            {
                numOfCustomers = 20;
            }
            else if(PastInWeather.Condition == "Rainy")
            {
                numOfCustomers = 10;
            }
            else if(PastInWeather.Condition == "Foggy")
            {
                numOfCustomers = 5;
            }
            for (int i = 0; i < numOfCustomers; i++)

            {
                customers.Add(new Customer());

            }
        }
    }
}
