using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Lemonade_Stand
{
    class Store
    {

        //member variables (Has A)
        Player player;



        // Constructor
        public Store()
        {

        }

        public void SellLemons()
        {
            Console.WriteLine("How many lemons do you want to buy");
            int amount = int.Parse(Console.ReadLine());
            for (int i = 0; i < amount; i++)
            {

            }
            player.inventory.Lemons.Add(new Lemon());
        }




        // member methods
    }
}
