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
        public double LemonPrices;
        public double SugarCubePrices;
        public double CupPrices;
        public double IceCubesPrices;



        // Constructor
        public Store()
        {
            LemonPrices = 0.25;
            SugarCubePrices = 0.10;
            CupPrices = 0.05;
            IceCubesPrices = 0.05;

        }

        public void SellLemons()
        {
            Console.WriteLine("How many lemons do you want to buy?");
            int amount = int.Parse(Console.ReadLine());
            for (int i = 0; i < amount; i++)
            {
                player.inventory.Lemons.Add(new Lemon());
            }
            player.wallet.money -= LemonPrices * amount;
        }

        public void SellIceCubes()
        {
            Console.WriteLine("How many ice cubes do you want to buy?");
            int ammount = int.Parse(Console.ReadLine());
            for (int i = 0; i < ammount; i++)
            {
                player.inventory.IceCubes.Add(new IceCubes());
            }
            player.wallet.money -= IceCubesPrices * ammount;        
        }
    
        public void SellCups()
        {
            Console.WriteLine("How many cups do you want to buy?");
            int ammount = int.Parse(Console.ReadLine());
            for (int i = 0; i < ammount; i++)
            {
                player.inventory.Cups.Add(new Cups());
            }
            player.wallet.money -= CupPrices * ammount;
        }
    
        public void SellSugarCubes()
        {
            Console.WriteLine("How many sugar cubes do you want to buy?");
            int ammount = int.Parse(Console.ReadLine());
            for (int i = 0; i < ammount; i++)
            {
                player.inventory.SugarCubes.Add(new SugarCube());
            }
            player.wallet.money -= SugarCubePrices * ammount; 
        }
        
        // member methods
       

    }
}
