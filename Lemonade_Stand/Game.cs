using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Lemonade_Stand
{
    class Game
    {
        //member variables (Has A)
        Player player;
        List<Day> days;
        Store store;
        int currentDay;



        // Constructor
        public Game()
        {
            days = new List<Day>();
            days.Add(new Day("Monday"));
            days.Add(new Day("Tuesday"));
            days.Add(new Day("Wednesday"));
            days.Add(new Day("Thursday"));
            days.Add(new Day("Friday"));
            days.Add(new Day("Saturday"));
            days.Add(new Day("Sunday"));
            store = new Store();
        }





        // member methods
        public void RunGame()
        {
            Console.WriteLine("Welcome to Lemmonade Stand");
            CreatePlayer();
            RunDays();
            

        }
        public void CreatePlayer()
        {
            player = new Player();
        }
        public void RunDays()
        {
            for (int i = 0; i < days.Count; i++)
            {
                days[i].RunDay(store, player);
            }
        }
        
    }
    

}
